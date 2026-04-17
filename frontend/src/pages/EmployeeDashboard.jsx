import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { NavLink } from "react-router-dom";
import { ArrowUpRight, CircleNotch, Plus } from "@phosphor-icons/react";
import { StatusBadge, PriorityBadge } from "../components/Badges";
import { timeAgo } from "../lib/utils";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, r] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/tickets", { params: { scope: "mine" } }),
        ]);
        setStats(s.data);
        setRecent(r.data.slice(0, 6));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 mono-label">
        <CircleNotch className="animate-spin" /> Loading…
      </div>
    );
  }

  const kpis = [
    { label: "My Tickets", value: stats.total, hint: "All time" },
    { label: "Active", value: stats.active, hint: "Open · In Progress · Pending" },
    { label: "Resolved", value: stats.resolved, hint: "Awaiting closure" },
    { label: "Closed", value: stats.closed, hint: "Done" },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  return (
    <div className="p-6 md:p-8 max-w-[1200px]" data-testid="employee-dashboard-page">
      {/* Portal banner */}
      <div
        className="card-flat p-5 mb-6 flex items-center justify-between"
        style={{ background: "linear-gradient(110deg, #F5E9D4 0%, #FAF3E3 100%)", borderColor: "#E8D5A8" }}
      >
        <div>
          <div className="mono-label" style={{ color: "#8B6A1E" }}>
            Employee Portal · Your Requests
          </div>
          <h1
            className="text-3xl md:text-4xl font-semibold mt-1"
            style={{ fontFamily: "Cabinet Grotesk", color: "#3A2D0E", letterSpacing: "-0.02em" }}
          >
            Good {greeting}, {user?.name?.split(" ")[0]}.
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B5A32" }}>
            Need something from HR, Finance, Training, or another team? Raise a ticket and we'll take it from there.
          </p>
        </div>
        <NavLink
          to="/tickets/new"
          className="flex items-center gap-2 px-5 py-3 rounded-md text-sm font-medium transition-colors"
          style={{ background: "#B8722D", color: "#FAF9F6" }}
          data-testid="employee-new-ticket-cta"
        >
          <Plus size={15} weight="bold" /> Raise a Ticket
        </NavLink>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="stat-card"
            style={k.highlight ? { background: "#FDF6EC", borderColor: "#E8D5A8" } : {}}
            data-testid={`emp-kpi-${k.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="mono-label" style={k.highlight ? { color: "#8B6A1E" } : {}}>
              {k.label}
            </div>
            <div
              className="mt-2 text-3xl font-semibold"
              style={{
                fontFamily: "Cabinet Grotesk",
                letterSpacing: "-0.02em",
                color: k.highlight ? "#B8722D" : "var(--text-primary)",
              }}
            >
              {k.value}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              {k.hint}
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <QuickCard
          to="/my-tickets?scope=assigned_to_me"
          title="Work on Assigned"
          hint="Tickets you need to handle"
          count={stats.assigned_to_me || 0}
          testid="qc-assigned"
          accent
        />
        <QuickCard
          to="/my-tickets?scope=active"
          title="Track Active"
          hint="See what's in motion"
          count={stats.active}
          testid="qc-active"
        />
        <QuickCard
          to="/my-tickets?scope=resolved"
          title="Confirm Resolved"
          hint="Awaiting your closure"
          count={stats.resolved}
          testid="qc-resolved"
        />
      </div>

      {/* Recent tickets */}
      <div className="card-flat overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div>
            <div className="mono-label">Recent</div>
            <h3 className="text-lg font-medium mt-1" style={{ fontFamily: "Cabinet Grotesk" }}>
              My Latest Tickets
            </h3>
          </div>
          <NavLink
            to="/my-tickets"
            className="text-sm flex items-center gap-1"
            style={{ color: "#B8722D" }}
            data-testid="view-my-tickets"
          >
            View all <ArrowUpRight size={14} />
          </NavLink>
        </div>
        {recent.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mono-label mb-2">No Tickets Yet</div>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              Raise your first ticket and the team will jump on it.
            </p>
            <NavLink
              to="/tickets/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium"
              style={{ background: "#B8722D", color: "#FAF9F6" }}
            >
              <Plus size={14} /> Raise a Ticket
            </NavLink>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="mono-label" style={{ textAlign: "left" }}>
                <th className="py-3 px-5">Code</th>
                <th className="py-3 px-5">Title</th>
                <th className="py-3 px-5">Department</th>
                <th className="py-3 px-5">Priority</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Updated</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr
                  key={t.id}
                  className="row-hover"
                  style={{ borderTop: "1px solid var(--border-subtle)" }}
                  data-testid={`emp-recent-${t.code}`}
                >
                  <td
                    className="py-3 px-5"
                    style={{ fontFamily: "IBM Plex Mono", fontSize: 12, color: "var(--text-secondary)" }}
                  >
                    {t.code}
                  </td>
                  <td className="py-3 px-5">
                    <NavLink
                      to={`/tickets/${t.id}`}
                      className="hover:underline"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {t.title}
                    </NavLink>
                  </td>
                  <td className="py-3 px-5" style={{ color: "var(--text-secondary)" }}>
                    {t.department}
                  </td>
                  <td className="py-3 px-5">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="py-3 px-5">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="py-3 px-5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {timeAgo(t.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function QuickCard({ to, title, hint, count, accent, testid }) {
  return (
    <NavLink
      to={to}
      className="card-flat p-5 flex items-center justify-between transition-all"
      style={{
        borderColor: accent ? "#E8D5A8" : "var(--border-subtle)",
        background: accent ? "#FDF6EC" : "var(--surface-card)",
      }}
      data-testid={testid}
    >
      <div>
        <div
          className="text-sm font-medium"
          style={{ color: accent ? "#8B6A1E" : "var(--text-primary)", fontFamily: "Cabinet Grotesk" }}
        >
          {title}
        </div>
        <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
          {hint}
        </div>
      </div>
      <div
        className="text-2xl font-semibold"
        style={{
          fontFamily: "Cabinet Grotesk",
          color: accent ? "#B8722D" : "var(--brand-primary)",
        }}
      >
        {count}
      </div>
    </NavLink>
  );
}
