// src/pages/NotFoundPage.jsx
// Shows when no route matches — e.g. /random-page

import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <>
      <style>{`
        .notfound { min-height:80vh; background:#120a06; display:flex; align-items:center; justify-content:center; padding:2rem; text-align:center; }
        .notfound-inner { max-width:480px; }
        .notfound-code { font-family:Georgia,serif; font-size:96px; font-weight:400; color:rgba(196,148,72,0.15); line-height:1; margin:0 0 -12px; }
        .notfound-title { font-family:Georgia,serif; font-size:2rem; color:#f0dba8; margin:0 0 12px; }
        .notfound-desc { color:#7a5e3a; font-size:15px; line-height:1.7; margin:0 0 32px; }
        .notfound-btn { display:inline-flex; align-items:center; gap:8px; padding:0.75rem 2rem; background:linear-gradient(135deg,#c49448,#8b5e1a); border-radius:10px; color:#120a06; font-weight:700; text-decoration:none; font-size:14px; transition:opacity 0.2s; }
        .notfound-btn:hover { opacity:0.85; }
      `}</style>
      <div className="notfound">
        <div className="notfound-inner">
          <p className="notfound-code">404</p>
          <h1 className="notfound-title">Page not found</h1>
          <p className="notfound-desc">This page doesn't exist or has been moved. Let's get you back to the collection.</p>
          <Link to="/" className="notfound-btn">
            <i className="ti ti-arrow-left" aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </div>
    </>
  );
}