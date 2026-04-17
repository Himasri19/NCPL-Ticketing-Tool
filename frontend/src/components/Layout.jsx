import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { MagnifyingGlass, Bell } from "@phosphor-icons/react";

export default function Layout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [counts, setCounts] = useState({});
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [statsRes, deptRes] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/departments"),
        ]);
        setCounts(statsRes.data);
        setDepartments(deptRes.data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user, location.pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="mono-label">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-app)" }}>
      <Sidebar counts={counts} departments={departments} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header
          className="sticky top-0 z-10 flex items-center gap-4 px-6 py-3"
          style={{
            background: "rgba(250, 249, 246, 0.85)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border-subtle)",
            height: 60,
          }}
        >
          <div className="flex-1 max-w-md relative">
            <MagnifyingGlass
              size={14}
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}
            />
            <input
              data-testid="global-search"
              className="input-plain"
              placeholder="Search tickets, code, assignee…"
              style={{ paddingLeft: 32, height: 36 }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value) {
                  const q = encodeURIComponent(e.currentTarget.value);
                  navigate(user.role === "admin" ? `/tickets?q=${q}` : `/my-tickets?q=${q}`);
                }
              }}
            />
          </div>
          <button
            className="p-2 rounded hover:bg-white transition-colors relative"
            style={{ color: "var(--text-secondary)" }}
            data-testid="notifications-button"
            title="Notifications"
          >
            <Bell size={18} />
          </button>
          <div className="mono-label">
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" })}
          </div>
        </header>

        <main className="flex-1 fade-in" data-testid="main-content">
          <Outlet context={{ counts, departments, refreshCounts: () => {} }} />
        </main>
      </div>
    </div>
  );
}
