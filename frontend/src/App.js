import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import LandingPage from "@/pages/LandingPage";
import JobRequestPage from "@/pages/JobRequestPage";
import WorkerSignupPage from "@/pages/WorkerSignupPage";
import MarketerSignupPage from "@/pages/MarketerSignupPage";
import AuthCallback from "@/pages/AuthCallback";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import AccountSettings from "@/pages/AccountSettings";
import StripeReturnPage from "@/pages/StripeReturnPage";
import WorkerDashboard from "@/pages/WorkerDashboard";
import MarketerDashboard from "@/pages/MarketerDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import DashboardRedirect from "@/pages/DashboardRedirect";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/request" element={<JobRequestPage />} />
      <Route path="/join/worker" element={<WorkerSignupPage />} />
      <Route path="/join/marketer" element={<MarketerSignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/account" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
      <Route path="/account/stripe/return" element={<ProtectedRoute><StripeReturnPage /></ProtectedRoute>} />
      <Route path="/account/stripe/refresh" element={<ProtectedRoute><StripeReturnPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<DashboardRedirect />} />
      <Route path="/dashboard/worker" element={<ProtectedRoute><WorkerDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/marketer" element={<ProtectedRoute><MarketerDashboard /></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
