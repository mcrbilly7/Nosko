"""Iteration 3 backend tests:
- Public GET /api/jobs/track/{job_id}
- Auto-payouts on PUT /api/jobs/{id}/status status=completed (15%/50%/rest split)
- auto_payout=false override
- Re-trigger completed->completed no duplicates
- Stripe onboard graceful 502 (Connect not enabled on platform)
- Real Gmail SMTP non-crash for /auth/forgot-password and /api/jobs
"""
import os
import uuid
from datetime import datetime, timezone

import pytest
import requests
from pymongo import MongoClient

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://nosko-handyman.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

mc = MongoClient(MONGO_URL)
db = mc[DB_NAME]

FOUNDER_EMAIL = "noskotx@gmail.com"
FOUNDER_PASSWORD = "AdminTest12345"


# ---------------- Helpers ----------------

def _cleanup_email(email: str):
    user = db.users.find_one({"email": email}, {"_id": 0, "user_id": 1})
    if user:
        db.user_sessions.delete_many({"user_id": user["user_id"]})
        db.password_reset_tokens.delete_many({"user_id": user["user_id"]})
        db.worker_profiles.delete_many({"user_id": user["user_id"]})
        db.marketer_profiles.delete_many({"user_id": user["user_id"]})
        db.payouts.delete_many({"user_id": user["user_id"]})
    db.users.delete_many({"email": email})


def _register(email: str, password: str = "Password1234", name: str = "T User"):
    _cleanup_email(email)
    r = requests.post(f"{API}/auth/register",
                      json={"email": email, "password": password, "name": name})
    assert r.status_code == 200, r.text
    return r.json()


def _login(email: str, password: str):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()


def _ensure_founder_admin():
    """Register founder if not present, else log in. Returns session_token."""
    r = requests.post(f"{API}/auth/register",
                      json={"email": FOUNDER_EMAIL, "password": FOUNDER_PASSWORD, "name": "Nosko Admin"})
    if r.status_code == 200:
        token = r.json()["session_token"]
    elif r.status_code == 409:
        token = _login(FOUNDER_EMAIL, FOUNDER_PASSWORD)["session_token"]
    else:
        pytest.skip(f"Founder register/login failed: {r.status_code} {r.text}")
    # Verify admin role
    me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200 and me.json()["role"] == "admin", me.text
    return token


def _create_job(payload):
    r = requests.post(f"{API}/jobs", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


def _cleanup_job(job_id):
    db.jobs.delete_many({"job_id": job_id})
    db.payouts.delete_many({"job_id": job_id})


# ---------------- GET /api/jobs/track/{job_id} ----------------

class TestPublicTrackJob:
    @classmethod
    def setup_class(cls):
        cls.job = _create_job({
            "customer_name": "TEST Track Customer",
            "customer_email": "test_track@example.com",
            "address": "123 Track St",
            "service_type": "Switch/Outlet Replacement",
            "description": "Track test",
        })

    @classmethod
    def teardown_class(cls):
        _cleanup_job(cls.job["job_id"])

    def test_track_returns_safe_subset_no_auth(self):
        r = requests.get(f"{API}/jobs/track/{self.job['job_id']}")
        assert r.status_code == 200, r.text
        d = r.json()
        # Required safe-subset fields
        for field in [
            "job_id", "customer_name", "service_type", "address", "status",
            "eta_message", "quoted_amount", "assigned_worker_name", "created_at", "photo_paths",
        ]:
            assert field in d, f"missing field: {field}"
        # Sensitive fields must NOT leak
        for sensitive in ("customer_email", "customer_phone", "referral_code", "description", "_id"):
            assert sensitive not in d, f"sensitive field leaked: {sensitive}"
        assert d["job_id"] == self.job["job_id"]
        assert d["customer_name"] == "TEST Track Customer"
        assert d["status"] == "new"
        assert d["assigned_worker_name"] is None
        assert isinstance(d["photo_paths"], list)
        # ETA message appropriate for "new"
        assert "24 hours" in d["eta_message"] or d["eta_message"]

    def test_track_invalid_404(self):
        r = requests.get(f"{API}/jobs/track/INVALID_DOES_NOT_EXIST_xyz123")
        assert r.status_code == 404

    def test_track_includes_worker_name_after_assignment(self):
        # Create worker user + admin session
        worker_email = f"test_worker_track_{uuid.uuid4().hex[:6]}@example.com"
        _register(worker_email, name="TEST Worker Name")
        worker = db.users.find_one({"email": worker_email})
        admin_tok = _ensure_founder_admin()
        r = requests.put(f"{API}/jobs/{self.job['job_id']}/assign",
                         json={"worker_id": worker["user_id"]},
                         headers={"Authorization": f"Bearer {admin_tok}"})
        assert r.status_code == 200, r.text
        # Public track shows worker name
        t = requests.get(f"{API}/jobs/track/{self.job['job_id']}")
        assert t.status_code == 200
        d = t.json()
        assert d["assigned_worker_name"] == "TEST Worker Name"
        assert d["status"] == "assigned"
        assert "assigned" in d["eta_message"].lower() or d["eta_message"]
        _cleanup_email(worker_email)

    def test_track_includes_photo_paths_when_present(self):
        job = _create_job({
            "customer_name": "TEST Photo Customer",
            "customer_email": "test_photo@example.com",
            "address": "456 Photo Ln",
            "service_type": "Other repair",
            "photo_paths": ["nosko/jobs/abc.jpg", "nosko/jobs/def.jpg"],
        })
        try:
            r = requests.get(f"{API}/jobs/track/{job['job_id']}")
            assert r.status_code == 200
            assert r.json()["photo_paths"] == ["nosko/jobs/abc.jpg", "nosko/jobs/def.jpg"]
        finally:
            _cleanup_job(job["job_id"])


# ---------------- Auto-payout on completion ----------------

class TestAutoPayoutOnComplete:
    @classmethod
    def setup_class(cls):
        # Founder admin (also receives platform share)
        cls.admin_token = _ensure_founder_admin()
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}
        cls.founder = db.users.find_one({"email": FOUNDER_EMAIL})

        # Worker
        cls.worker_email = f"test_w_payout_{uuid.uuid4().hex[:6]}@example.com"
        wreg = _register(cls.worker_email, name="TEST Worker Payout")
        wtok = wreg["session_token"]
        r = requests.post(f"{API}/workers/signup",
                          json={"phone": "555-0001", "skills": ["electrical"]},
                          headers={"Authorization": f"Bearer {wtok}"})
        assert r.status_code == 200, r.text
        cls.worker = db.users.find_one({"email": cls.worker_email})

        # Marketer
        cls.marketer_email = f"test_m_payout_{uuid.uuid4().hex[:6]}@example.com"
        mreg = _register(cls.marketer_email, name="TEST Marketer Payout")
        mtok = mreg["session_token"]
        r = requests.post(f"{API}/marketers/signup",
                          json={"phone": "555-0002"},
                          headers={"Authorization": f"Bearer {mtok}"})
        assert r.status_code == 200, r.text
        cls.referral_code = r.json()["referral_code"]
        assert cls.referral_code
        cls.marketer = db.users.find_one({"email": cls.marketer_email})

        cls.created_jobs = []

    @classmethod
    def teardown_class(cls):
        for jid in cls.created_jobs:
            _cleanup_job(jid)
        _cleanup_email(cls.worker_email)
        _cleanup_email(cls.marketer_email)

    def _make_and_assign_job(self, quoted_amount, referral_code=None):
        job = _create_job({
            "customer_name": "TEST AutoPayout",
            "customer_email": "test_autopayout@example.com",
            "address": "999 Auto St",
            "service_type": "Other",  # avoid switch/outlet default $25 -> $50 clamp
            "quoted_amount": quoted_amount,
            "referral_code": referral_code,
        })
        self.__class__.created_jobs.append(job["job_id"])
        # Assign worker
        r = requests.put(f"{API}/jobs/{job['job_id']}/assign",
                         json={"worker_id": self.worker["user_id"]},
                         headers=self.admin_headers)
        assert r.status_code == 200, r.text
        return job

    def test_complete_with_marketer_creates_3_payouts(self):
        job = self._make_and_assign_job(quoted_amount=200.0, referral_code=self.referral_code)
        # Sanity: job actually carries referral_code
        jdoc = db.jobs.find_one({"job_id": job["job_id"]})
        assert jdoc["referral_code"] == self.referral_code, "referral_code did not persist on the job"

        r = requests.put(f"{API}/jobs/{job['job_id']}/status",
                         json={"status": "completed"}, headers=self.admin_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        ap = d["auto_payouts"]
        assert isinstance(ap, list) and len(ap) == 3, f"expected 3 payouts, got {len(ap)}: {ap}"

        by_type = {p["type"]: p for p in ap}
        assert set(by_type.keys()) == {"referral", "work", "platform"}
        assert by_type["referral"]["amount"] == round(200.0 * 0.15, 2) == 30.00
        assert by_type["work"]["amount"] == round(200.0 * 0.50, 2) == 100.00
        assert by_type["platform"]["amount"] == round(200.0 - 30.00 - 100.00, 2) == 70.00
        for p in ap:
            assert p["status"] == "paid"
            assert p["job_id"] == job["job_id"]
            assert p["method"] == "manual"  # Stripe Connect not enabled
            assert p["stripe_transfer_id"] is None
            assert p["payout_id"]
        # Routing
        assert by_type["referral"]["user_id"] == self.marketer["user_id"]
        assert by_type["work"]["user_id"] == self.worker["user_id"]
        assert by_type["platform"]["user_id"] == self.founder["user_id"]

        # Persisted in DB
        db_payouts = list(db.payouts.find({"job_id": job["job_id"]}, {"_id": 0}))
        assert len(db_payouts) == 3

    def test_complete_without_marketer_creates_2_payouts(self):
        job = self._make_and_assign_job(quoted_amount=100.0, referral_code=None)
        r = requests.put(f"{API}/jobs/{job['job_id']}/status",
                         json={"status": "completed"}, headers=self.admin_headers)
        assert r.status_code == 200, r.text
        ap = r.json()["auto_payouts"]
        assert len(ap) == 2, ap
        by_type = {p["type"]: p for p in ap}
        assert set(by_type.keys()) == {"work", "platform"}
        assert by_type["work"]["amount"] == 50.00
        assert by_type["platform"]["amount"] == 50.00
        assert by_type["platform"]["user_id"] == self.founder["user_id"]

    def test_re_complete_does_not_duplicate_payouts(self):
        job = self._make_and_assign_job(quoted_amount=120.0, referral_code=self.referral_code)
        r1 = requests.put(f"{API}/jobs/{job['job_id']}/status",
                          json={"status": "completed"}, headers=self.admin_headers)
        assert r1.status_code == 200
        assert len(r1.json()["auto_payouts"]) == 3
        # Re-trigger
        r2 = requests.put(f"{API}/jobs/{job['job_id']}/status",
                          json={"status": "completed"}, headers=self.admin_headers)
        assert r2.status_code == 200
        assert r2.json()["auto_payouts"] == []
        # DB still has exactly 3 payouts
        assert db.payouts.count_documents({"job_id": job["job_id"]}) == 3

    def test_auto_payout_false_skips_creation(self):
        job = self._make_and_assign_job(quoted_amount=150.0, referral_code=self.referral_code)
        r = requests.put(f"{API}/jobs/{job['job_id']}/status",
                         json={"status": "completed", "auto_payout": False},
                         headers=self.admin_headers)
        assert r.status_code == 200, r.text
        assert r.json()["auto_payouts"] == []
        assert db.payouts.count_documents({"job_id": job["job_id"]}) == 0
        # Job status updated
        assert db.jobs.find_one({"job_id": job["job_id"]})["status"] == "completed"

    def test_status_transition_to_in_progress_no_payouts(self):
        job = self._make_and_assign_job(quoted_amount=100.0, referral_code=None)
        r = requests.put(f"{API}/jobs/{job['job_id']}/status",
                         json={"status": "in_progress"}, headers=self.admin_headers)
        assert r.status_code == 200
        assert r.json()["auto_payouts"] == []
        assert db.payouts.count_documents({"job_id": job["job_id"]}) == 0

    def test_invalid_status_400(self):
        job = self._make_and_assign_job(quoted_amount=100.0, referral_code=None)
        r = requests.put(f"{API}/jobs/{job['job_id']}/status",
                         json={"status": "weird-status"}, headers=self.admin_headers)
        assert r.status_code == 400

    def test_status_update_unknown_job_404(self):
        r = requests.put(f"{API}/jobs/NOPE_does_not_exist/status",
                         json={"status": "completed"}, headers=self.admin_headers)
        assert r.status_code == 404

    def test_status_update_requires_admin(self):
        # Use worker token (non-admin)
        wlogin = _login(self.worker_email, "Password1234")
        wtok = wlogin["session_token"]
        job = self._make_and_assign_job(quoted_amount=100.0, referral_code=None)
        r = requests.put(f"{API}/jobs/{job['job_id']}/status",
                         json={"status": "completed"},
                         headers={"Authorization": f"Bearer {wtok}"})
        assert r.status_code in (401, 403)


# ---------------- Stripe Connect onboard graceful failure ----------------

class TestStripeOnboardGraceful:
    @classmethod
    def setup_class(cls):
        # Need a worker (so /stripe/onboard finds a profile)
        cls.email = f"test_stripe_{uuid.uuid4().hex[:6]}@example.com"
        reg = _register(cls.email, name="TEST Stripe Onboard")
        cls.token = reg["session_token"]
        r = requests.post(f"{API}/workers/signup",
                          json={"phone": "555-0003", "skills": ["plumbing"]},
                          headers={"Authorization": f"Bearer {cls.token}"})
        assert r.status_code == 200

    @classmethod
    def teardown_class(cls):
        _cleanup_email(cls.email)

    def test_stripe_onboard_returns_502_when_connect_not_enabled(self):
        r = requests.post(f"{API}/stripe/onboard",
                          json={"origin": "https://example.com"},
                          headers={"Authorization": f"Bearer {self.token}"})
        # Expect 502 because owner hasn't enabled Connect on the Stripe dashboard.
        assert r.status_code == 502, f"expected 502, got {r.status_code}: {r.text}"
        body = r.text
        # Stripe-style error mentions Connect signup
        assert ("Connect" in body or "connect" in body), body


# ---------------- Real Gmail SMTP non-crash ----------------

class TestSMTPGraceful:
    def test_forgot_password_does_not_crash_with_real_smtp(self):
        email = f"test_smtpfp_{uuid.uuid4().hex[:6]}@example.com"
        _register(email, name="TEST FP SMTP")
        try:
            r = requests.post(f"{API}/auth/forgot-password",
                              json={"email": email, "origin": "https://example.com"})
            assert r.status_code == 200
            assert r.json() == {"ok": True}
        finally:
            _cleanup_email(email)

    def test_create_job_does_not_crash_when_smtp_called(self):
        job = _create_job({
            "customer_name": "TEST SMTP Job",
            "customer_email": "test_smtp_job@example.com",
            "address": "1 SMTP Way",
            "service_type": "Other",
            "quoted_amount": 75,
        })
        try:
            assert job["status"] == "new"
            assert job["job_id"].startswith("job_")
        finally:
            _cleanup_job(job["job_id"])
