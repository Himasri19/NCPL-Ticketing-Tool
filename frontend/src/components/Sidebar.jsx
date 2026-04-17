import React, { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  House,
  ListChecks,
  Archive,
  ClockCounterClockwise,
  CheckCircle,
  XCircle,
  UserCircleGear,
  Flag,
  WarningOctagon,
  FireSimple,
  Users,
  Buildings,
  ChartBar,
  GearSix,
  Plus,
  SignOut,
  PaperPlaneTilt,
  Tray,
  HourglassMedium,
  IdentificationBadge,
  Briefcase,
  GraduationCap,
  Handshake,
  Coin,
  Star,
} from "@phosphor-icons/react";

const DEPT_ICONS = {
  HR: IdentificationBadge,
  Sales: Briefcase,
  Training: GraduationCap,
  Mentoring: Handshake,
  Finance: Coin,
  Hrudai: Star,
};

export default function Sidebar({ counts = {}, departments = [] }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "admin";

  const adminNav = useMemo(
    () => [
      { section: "Overview" },
      { to: "/dashboard", label: "Dashboard", icon: House, testid: "nav-dashboard" },
      { to: "/tickets", label: "All Tickets", icon: ListChecks, count: counts.total, testid: "nav-all-tickets" },

      { section: "Tickets by Status" },
      { to: "/tickets?scope=active", label: "Active", icon: PaperPlaneTilt, count: counts.active, testid: "nav-active" },
      { to: "/tickets?scope=unassigned", label: "Unassigned", icon: Tray, count: counts.unassigned, testid: "nav-unassigned" },
      { to: "/tickets?status=In+Progress", label: "In Progress", icon: ClockCounterClockwise, testid: "nav-in-progress" },
      { to: "/tickets?status=Pending", label: "Pending", icon: HourglassMedium, testid: "nav-pending" },
      { to: "/tickets?status=Resolved", label: "Resolved", icon: CheckCircle, count: counts.resolved, testid: "nav-resolved" },
      { to: "/tickets?status=Closed", label: "Closed", icon: XCircle, count: counts.closed, testid: "nav-closed" },

      { section: "My Work" },
      { to: "/tickets?scope=assigned_to_me", label: "Assigned to Me", icon: UserCircleGear, testid: "nav-assigned-me" },
      { to: "/tickets?scope=high_priority", label: "High Priority", icon: Flag, count: counts.high_priority, testid: "nav-high-priority" },
      { to: "/tickets?scope=escalated", label: "Escalated", icon: FireSimple, count: counts.escalated, testid: "nav-escalated" },
      { to: "/tickets?scope=overdue", label: "Overdue", icon: WarningOctagon, testid: "nav-overdue" },

      { section: "Tickets by Department" },
      ...departments.map((d) => ({
        to: `/tickets?department=${encodeURIComponent(d.name)}`,
        label: `${d.name} Tickets`,
        icon: DEPT_ICONS[d.name] || Archive,
        testid: `nav-dept-${d.name.toLowerCase()}`,
      })),

      { section: "Manage" },
      { to: "/employees", label: "Employees", icon: Users, testid: "nav-employees" },
      { to: "/departments", label: "Departments", icon: Buildings, testid: "nav-departments" },
      { to: "/reports", label: "Reports", icon: ChartBar, testid: "nav-reports" },
      { to: "/settings", label: "Settings", icon: GearSix, testid: "nav-settings" },
    ],
    [counts, departments],
  );

  const employeeNav = useMemo(
    () => [
      { section: "My Tickets" },
      { to: "/my-tickets?scope=active", label: "Active", icon: PaperPlaneTilt, testid: "nav-my-active" },
      { to: "/my-tickets?scope=resolved", label: "Resolved", icon: CheckCircle, testid: "nav-my-resolved" },
      { to: "/my-tickets?scope=closed", label: "Closed", icon: XCircle, testid: "nav-my-closed" },
    ],
    [],
  );

  const items = isAdmin ? adminNav : employeeNav;
  const ctaTo = isAdmin ? "/tickets/new" : "/tickets/new";

  return (
    <aside
      className="w-64 shrink-0 h-screen sticky top-0 flex flex-col"
      style={{ background: "var(--surface-sidebar)", borderRight: "1px solid var(--border-subtle)" }}
      data-testid="sidebar"
    >
      {/* Brand */}
      <div className="px-4 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          style={{
            width: 28,
            height: 28,
            border: "1.5px solid var(--text-primary)",
            borderRadius: 6,
            display: "grid",
            placeItems: "center",
            fontFamily: "Cabinet Grotesk",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          &amp;
        </div>
        <div>
          <div style={{ fontFamily: "Cabinet Grotesk", fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em" }}>
            NCPL · Ticketing
          </div>
          <div className="mono-label" style={{ fontSize: 9.5, marginTop: 1 }}>
            {isAdmin ? "Admin Console" : "Employee Portal"}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-3 pt-3">
        <NavLink
          to={ctaTo}
          data-testid="create-ticket-cta"
          className="w-full flex items-center justify-center gap-2 btn-primary"
          style={{ padding: "9px 12px" }}
        >
          <Plus size={14} weight="bold" />
          New Ticket
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {items.map((item, idx) => {
          if (item.section) {
            return (
              <div key={`s-${idx}`} className="sidebar-section">
                {item.section}
              </div>
            );
          }
          const Icon = item.icon;
          const to = item.to;
          const isActive =
            location.pathname + location.search === to ||
            (location.pathname === to.split("?")[0] &&
              !to.includes("?") &&
              !location.search);
          return (
            <NavLink
              key={to}
              to={to}
              data-testid={item.testid}
              className={`sidebar-item ${isActive ? "active" : ""}`}
            >
              <Icon size={15} weight="duotone" />
              <span>{item.label}</span>
              {item.count !== undefined && item.count !== null && (
                <span className="sidebar-count">{item.count}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer: profile */}
      <div
        className="px-3 py-3 flex items-center gap-3"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div
          className="rounded-full overflow-hidden flex-shrink-0"
          style={{ width: 32, height: 32, background: "var(--brand-primary)" }}
        >
          {user?.picture ? (
            <img src={user.picture} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full grid place-items-center text-xs font-medium"
              style={{ color: "#FAF9F6" }}
            >
              {(user?.name || "?")[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {user?.name}
          </div>
          <div className="mono-label truncate" style={{ fontSize: 9.5 }}>
            {user?.role}
          </div>
        </div>
        <button
          onClick={logout}
          data-testid="logout-button"
          className="p-1.5 rounded hover:bg-white transition-colors"
          title="Sign out"
        >
          <SignOut size={15} />
        </button>
      </div>
    </aside>
  );
}
