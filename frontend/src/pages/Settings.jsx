import React from "react";
import { useAuth } from "../context/AuthContext";
import { initials } from "../lib/utils";

export default function Settings() {
  const { user } = useAuth();
  return (
    <div className="p-6 md:p-8 max-w-3xl" data-testid="settings-page">
      <div className="mb-6">
        <div className="mono-label">Account</div>
        <h1 className="text-3xl font-semibold mt-1" style={{ fontFamily: "Cabinet Grotesk" }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Workspace preferences &amp; profile details.
        </p>
      </div>

      <div className="card-flat p-6 mb-4">
        <div className="mono-label mb-4">Your Profile</div>
        <div className="flex items-center gap-4">
          <div style={{ width: 54, height: 54, borderRadius: "50%", background: "var(--brand-primary)", color: "#FAF9F6", display: "grid", placeItems: "center", fontSize: 18, fontWeight: 600 }}>
            {user?.picture ? <img src={user.picture} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : initials(user?.name)}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{user?.name}</div>
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{user?.email}</div>
            <div className="mono-label mt-1">{user?.role}{user?.department ? ` · ${user.department}` : ""}</div>
          </div>
        </div>
      </div>

      <div className="card-flat p-6">
        <div className="mono-label mb-2">Workspace</div>
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
          NCPL Internal Ticketing · v1. Authentication managed via Emergent SSO (Google). Sessions valid for 7 days.
        </div>
      </div>
    </div>
  );
}
