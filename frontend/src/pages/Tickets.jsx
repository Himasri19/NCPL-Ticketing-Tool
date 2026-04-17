import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, PriorityBadge } from "../components/Badges";
import { timeAgo, initials } from "../lib/utils";
import { CircleNotch, Plus, FunnelSimple } from "@phosphor-icons/react";

const STATUS_OPTIONS = ["", "Open", "In Progress", "Pending", "Resolved", "Closed"];
const PRIORITY_OPTIONS = ["", "Low", "Medium", "High", "Urgent"];

export default function Tickets({ employeeView = false }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const filters = useMemo(() => ({
    scope: params.get("scope") || "",
    status: params.get("status") || "",
    department: params.get("department") || "",
    priority: params.get("priority") || "",
    q: params.get("q") || "",
  }), [params]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const q = {};
        Object.entries(filters).forEach(([k, v]) => {
          if (v) q[k] = v;
        });
        if (employeeView && !q.scope) q.scope = "mine";
        const [t, d] = await Promise.all([
          api.get("/tickets", { params: q }),
          api.get("/departments"),
        ]);
        setTickets(t.data);
        setDepartments(d.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [filters, employeeView]);

  const title = useMemo(() => {
    if (employeeView) {
      if (filters.scope === "resolved") return "Resolved Tickets";
      if (filters.scope === "closed") return "Closed Tickets";
      if (filters.scope === "active") return "Active Tickets";
      return "My Tickets";
    }
    if (filters.scope === "unassigned") return "Unassigned Tickets";
    if (filters.scope === "assigned_to_me") return "Assigned to Me";
    if (filters.scope === "escalated") return "Escalated Tickets";
    if (filters.scope === "high_priority") return "High Priority Tickets";
    if (filters.scope === "overdue") return "Overdue Tickets";
    if (filters.scope === "active") return "Active Tickets";
    if (filters.status) return `${filters.status} Tickets`;
    if (filters.department) return `${filters.department} Tickets`;
    return "All Tickets";
  }, [filters, employeeView]);

  const updateFilter = (key, value) => {
    const p = new URLSearchParams(location.search);
    if (value) p.set(key, value);
    else p.delete(key);
    navigate(`${location.pathname}?${p.toString()}`);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px]" data-testid="tickets-page">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="mono-label mb-2">
            {user?.role === "admin" && !employeeView ? "Queue" : "Personal"} · {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
          </div>
          <h1 className="text-3xl font-semibold" style={{ fontFamily: "Cabinet Grotesk" }}>
            {title}
          </h1>
        </div>
        <NavLink to="/tickets/new" className="btn-primary flex items-center gap-1.5" data-testid="new-ticket-button">
          <Plus size={14} weight="bold" /> New Ticket
        </NavLink>
      </div>

      {/* Filters */}
      <div className="card-flat p-4 mb-4 flex items-center gap-3 flex-wrap">
        <FunnelSimple size={15} style={{ color: "var(--text-tertiary)" }} />
        <select
          data-testid="filter-status"
          className="input-plain"
          style={{ width: 150 }}
          value={filters.status}
          onChange={(e) => updateFilter("status", e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || "All Status"}</option>
          ))}
        </select>
        <select
          data-testid="filter-priority"
          className="input-plain"
          style={{ width: 150 }}
          value={filters.priority}
          onChange={(e) => updateFilter("priority", e.target.value)}
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>{p || "All Priority"}</option>
          ))}
        </select>
        {!employeeView && (
          <select
            data-testid="filter-department"
            className="input-plain"
            style={{ width: 180 }}
            value={filters.department}
            onChange={(e) => updateFilter("department", e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        )}
        <input
          data-testid="filter-search"
          className="input-plain"
          style={{ width: 220 }}
          placeholder="Search by title, code…"
          defaultValue={filters.q}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateFilter("q", e.currentTarget.value);
          }}
        />
        {Object.values(filters).some(Boolean) && (
          <button
            onClick={() => navigate(location.pathname)}
            className="text-xs underline"
            style={{ color: "var(--text-tertiary)" }}
            data-testid="clear-filters"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card-flat overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center gap-2 mono-label justify-center">
            <CircleNotch className="animate-spin" /> Loading…
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mono-label mb-2">Empty Queue</div>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              No tickets match these filters.
            </p>
            <NavLink to="/tickets/new" className="btn-primary inline-flex items-center gap-1.5">
              <Plus size={14} /> Create the first ticket
            </NavLink>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="mono-label" style={{ textAlign: "left" }}>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Dept</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Requester</th>
                <th className="py-3 px-4">Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  className="row-hover cursor-pointer"
                  style={{ borderTop: "1px solid var(--border-subtle)" }}
                  onClick={() => navigate(`/tickets/${t.id}`)}
                  data-testid={`ticket-row-${t.code}`}
                >
                  <td className="py-3 px-4" style={{ fontFamily: "IBM Plex Mono", fontSize: 12, color: "var(--text-secondary)" }}>
                    {t.code}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{t.title}</span>
                      {t.is_escalated && (
                        <span className="badge-status" style={{ background: "#FDF0EF", color: "#D9534F" }}>
                          Escalated
                        </span>
                      )}
                      {t.attachments_count > 0 && (
                        <span className="mono-label" style={{ fontSize: 10 }}>
                          📎 {t.attachments_count}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>{t.department}</td>
                  <td className="py-3 px-4"><PriorityBadge priority={t.priority} /></td>
                  <td className="py-3 px-4"><StatusBadge status={t.status} /></td>
                  <td className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>
                    {t.assignee_name ? (
                      <div className="flex items-center gap-2">
                        <div
                          style={{
                            width: 22, height: 22, borderRadius: "50%",
                            background: "var(--brand-primary)", color: "#FAF9F6",
                            fontSize: 10, display: "grid", placeItems: "center",
                          }}
                        >
                          {initials(t.assignee_name)}
                        </div>
                        <span>{t.assignee_name}</span>
                      </div>
                    ) : (
                      <span className="mono-label" style={{ fontSize: 10 }}>Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>{t.created_by_name}</td>
                  <td className="py-3 px-4 text-xs" style={{ color: "var(--text-tertiary)" }}>{timeAgo(t.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
