import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-black/10 mt-0 bg-white">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-14 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="font-display text-3xl tracking-tighter">NOSKO</div>
          <p className="text-sm mt-3 max-w-sm text-neutral-600">
            Full-service handyman based in the DFW Metroplex. $25 set price on switch/outlet swaps. $50 minimum on every job. W9 / 1099 compliant.
          </p>
          <a href="mailto:noskotx@gmail.com" className="overline mt-4 inline-block">noskotx@gmail.com</a>
        </div>
        <div>
          <div className="overline mb-3 text-neutral-500">Services</div>
          <ul className="space-y-1.5 text-sm">
            <li>Electrical (outlet/switch · $25)</li>
            <li>Plumbing fixes</li>
            <li>Drywall & paint</li>
            <li>Carpentry & install</li>
            <li>Tile & flooring</li>
          </ul>
        </div>
        <div>
          <div className="overline mb-3 text-neutral-500">Company</div>
          <ul className="space-y-1.5 text-sm">
            <li><Link to="/request">Request a quote</Link></li>
            <li><Link to="/join/worker">Become a handyman</Link></li>
            <li><Link to="/join/marketer">Marketer program</Link></li>
            <li><Link to="/login">Sign in</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-black/10 py-4 text-center overline text-xs text-neutral-500">
        © {new Date().getFullYear()} NOSKO HANDYMAN CO. · DFW METROPLEX
      </div>
    </footer>
  );
}
