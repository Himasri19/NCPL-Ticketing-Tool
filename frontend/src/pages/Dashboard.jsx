import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { NavLink } from "react-router-dom";
import { ArrowUpRight, CircleNotch } from "@phosphor-icons/react";
import { StatusBadge, PriorityBadge } from "../components/Badges";
import { timeAgo } from "../lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

const STATUS_COLORS = {
  Open: "#4A90E2",
  "In Progress": "#4A90E2",
  Pending: "#E6A23C",
  Resolved: "#5CB85C",
  Closed: "#8C8C8C",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, r] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/tickets", { params: { scope: "active" } }),
        ]);
        setStats(s.data);
        setRecent(r.data.slice(0, 8));
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
        <CircleNotch className="animate-spin" /> Loading dashboard…
      </div>
    );
  }

  const kpis = user?.role === "admin"
    ? [
        { label: "Total Tickets", value: stats.total, hint: "All time" },
        { label: "Active", value: stats.active, hint: "Open · In Progress · Pending" },
        { label: "Unassigned", value: stats.unassigned, hint: "Need triage" },
        { label: "High Priority", value: stats.high_priority, hint: "Open High/Urgent" },
        { label: "Resolved", value: stats.resolved, hint: "Awaiting closure" },
        { label: "Escalated", value: stats.escalated, hint: "Flagged" },
      ]
    : [
        { label: "Total", value: stats.total, hint: "My tickets" },
        { label: "Active", value: stats.active, hint: "In motion" },
        { label: "Resolved", value: stats.resolved, hint: "Awaiting closure" },
        { label: "Closed", value: stats.closed, hint: "Done" },
      ];

  return (
    <div className="p-6 md:p-8 max-w-[1400px]" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="mono-label mb-2">Overview · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
          <h1
            className="text-3xl md:text-4xl font-semibold tracking-tight"
            style={{ fontFamily: "Cabinet Grotesk" }}
          >
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {user?.name?.split(" ")[0]}.
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {user?.role === "admin"
              ? "Your operations snapshot across all departments."
              : "Your personal ticket queue at a glance."}
          </p>
        </div>
        <NavLink to="/tickets/new" className="btn-primary" data-testid="header-new-ticket">
          + New Ticket
        </NavLink>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="stat-card" data-testid={`kpi-${k.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <div className="mono-label">{k.label}</div>
            <div
              className="mt-2 text-3xl font-semibold"
              style={{ fontFamily: "Cabinet Grotesk", letterSpacing: "-0.02em" }}
            >
              {k.value}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              {k.hint}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="card-flat p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="mono-label">Last 7 Days</div>
              <h3 className="text-lg font-medium mt-1" style={{ fontFamily: "Cabinet Grotesk" }}>
                Tickets Created
              </h3>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trend_7d}>
                <defs>
                  <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3A4B59" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3A4B59" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="#E5E2DC" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8C8C8C" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8C8C8C" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #E5E2DC",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#3A4B59" strokeWidth={2} fill="url(#gradBlue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-flat p-5">
          <div className="mono-label">Breakdown</div>
          <h3 className="text-lg font-medium mt-1 mb-4" style={{ fontFamily: "Cabinet Grotesk" }}>
            By Status
          </h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.by_status} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#E5E2DC" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#8C8C8C" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="status" type="category" tick={{ fontSize: 11, fill: "#595959" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip cursor={{ fill: "#FAF9F6" }} contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E2DC", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stats.by_status.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || "#3A4B59"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent active */}
      <div className="card-flat overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div>
            <div className="mono-label">Queue</div>
            <h3 className="text-lg font-medium mt-1" style={{ fontFamily: "Cabinet Grotesk" }}>
              Recently Active
            </h3>
          </div>
          <NavLink
            to={user?.role === "admin" ? "/tickets" : "/my-tickets"}
            className="text-sm flex items-center gap-1"
            style={{ color: "var(--brand-primary)" }}
            data-testid="view-all-tickets-link"
          >
            View all <ArrowUpRight size={14} />
          </NavLink>
        </div>
        {recent.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mono-label mb-2">Nothing Active</div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Your queue is clear. Great work.
            </p>
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
                <tr key={t.id} className="row-hover" style={{ borderTop: "1px solid var(--border-subtle)" }} data-testid={`dashboard-row-${t.code}`}>
                  <td className="py-3 px-5 mono" style={{ fontFamily: "IBM Plex Mono", fontSize: 12, color: "var(--text-secondary)" }}>
                    {t.code}
                  </td>
                  <td className="py-3 px-5">
                    <NavLink to={`/tickets/${t.id}`} className="hover:underline" style={{ color: "var(--text-primary)" }}>
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
