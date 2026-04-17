import React from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function Login() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-app)" }}>
        <span className="mono-label">Loading…</span>
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2" data-testid="login-page">
      {/* Left visual panel */}
      <div
        className="relative hidden md:flex flex-col justify-between p-10 noise-overlay"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(28,28,28,0.7), rgba(58,75,89,0.85)), url('https://images.unsplash.com/photo-1549890299-4ced92a8a11a?crop=entropy&cs=srgb&fm=jpg&q=85')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "#FAF9F6",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 28,
              height: 28,
              border: "1.5px solid #FAF9F6",
              borderRadius: 6,
              display: "grid",
              placeItems: "center",
              fontFamily: "Cabinet Grotesk",
              fontWeight: 700,
            }}
          >
            &
          </div>
          <div style={{ fontFamily: "Cabinet Grotesk", fontWeight: 600, letterSpacing: "-0.02em", fontSize: 18 }}>
            NCPL · Ticketing
          </div>
        </div>

        <div className="max-w-md">
          <div className="mono-label" style={{ color: "#D8D5CC", marginBottom: 16 }}>
            Internal Workflow · v1
          </div>
          <h1
            className="text-4xl md:text-5xl font-semibold tracking-tight"
            style={{ fontFamily: "Cabinet Grotesk", lineHeight: 1.05 }}
          >
            A quieter way to route work across your departments.
          </h1>
          <p className="mt-4 text-sm" style={{ color: "#D8D5CC", lineHeight: 1.6 }}>
            One shared queue for HR, Sales, Training, Mentoring, Finance and Hrudai. Raise, triage, resolve —
            without the noise.
          </p>
        </div>

        <div className="flex gap-6 mono-label" style={{ color: "#B8B4A9" }}>
          <span>01 · raise</span>
          <span>02 · assign</span>
          <span>03 · resolve</span>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-8" style={{ background: "var(--bg-app)" }}>
        <div className="w-full max-w-sm fade-in">
          <div className="mono-label mb-3">Sign In · Secure SSO</div>
          <h2
            className="text-3xl font-semibold mb-2"
            style={{ fontFamily: "Cabinet Grotesk", letterSpacing: "-0.02em" }}
          >
            Welcome back.
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
            Use your company Google account to continue. Admins manage the workspace; employees raise &amp; track
            their tickets.
          </p>

          <button
            data-testid="google-login-button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border rounded-md py-3 text-sm font-medium transition-colors"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.19 3.32v2.76h3.54c2.08-1.92 3.29-4.74 3.29-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.54-2.76c-.98.66-2.24 1.05-3.74 1.05-2.88 0-5.31-1.94-6.18-4.55H2.17v2.85A11 11 0 0 0 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.82 14.08A6.6 6.6 0 0 1 5.47 12c0-.72.13-1.42.35-2.08V7.07H2.17A11 11 0 0 0 1 12c0 1.77.42 3.45 1.17 4.93l3.65-2.85z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.07.56 4.22 1.64l3.15-3.15C17.45 2.07 14.97 1 12 1 7.7 1 3.99 3.47 2.17 7.07l3.65 2.85C6.69 7.32 9.12 5.38 12 5.38z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="mt-8 flex items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
            <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
            <span className="mono-label">Protected by Emergent SSO</span>
            <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
          </div>

          <p className="mt-6 text-xs" style={{ color: "var(--text-tertiary)" }}>
            By continuing you agree to NCPL's internal-use acceptable-use policy. Session expires in 7 days.
          </p>
        </div>
      </div>
    </div>
  );
}
