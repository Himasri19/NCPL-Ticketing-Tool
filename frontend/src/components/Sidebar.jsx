import React, { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { toast } from "sonner";
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
  Eye,
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
  const { user, logout, refresh } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const [previewing, setPreviewing] = useState(false);

  const previewAsEmployee = async () => {
    if (!window.confirm("Preview the Employee Portal? You'll be switched to a demo employee session for 2 hours. Sign out to return to admin.")) return;
    setPreviewing(true);
    try {
      await api.post("/auth/preview-employee");
      toast.success("Switched to Employee Portal");
      await refresh();
      window.location.href = "/dashboard";
    } catch (e) {
      toast.error("Failed to start preview");
    } finally {
      setPreviewing(false);
    }
  };

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
      { section: "Overview" },
      { to: "/dashboard", label: "Dashboard", icon: House, testid: "nav-emp-dashboard" },
      { to: "/tickets/new", label: "Create Ticket", icon: Plus, testid: "nav-emp-create" },

      { section: "My Tickets" },
      { to: "/my-tickets", label: "All", icon: ListChecks, testid: "nav-my-all" },
      { to: "/my-tickets?scope=active", label: "Active", icon: PaperPlaneTilt, testid: "nav-my-active" },
      { to: "/my-tickets?scope=resolved", label: "Resolved", icon: CheckCircle, testid: "nav-my-resolved" },
      { to: "/my-tickets?scope=closed", label: "Closed", icon: XCircle, testid: "nav-my-closed" },

      { section: "Account" },
      { to: "/settings", label: "Profile", icon: GearSix, testid: "nav-emp-settings" },
    ],
    [],
  );

  const items = isAdmin ? adminNav : employeeNav;

  // Theme per portal
  const theme = isAdmin
    ? {
        headerBg: "var(--brand-primary)",
        headerFg: "#FAF9F6",
        ctaBg: "var(--brand-primary)",
        ctaBgHover: "var(--brand-primary-hover)",
        portalLabel: "Admin Console",
        portalAccent: "var(--brand-primary)",
        tagBg: "#1C1C1C",
      }
    : {
        headerBg: "#B8722D",
        headerFg: "#FAF9F6",
        ctaBg: "#B8722D",
        ctaBgHover: "#9A5D21",
        portalLabel: "Employee Portal",
        portalAccent: "#B8722D",
        tagBg: "#8B6A1E",
      };

  return (
    <aside
      className="w-64 shrink-0 h-screen sticky top-0 flex flex-col"
      style={{ background: "var(--surface-sidebar)", borderRight: "1px solid var(--border-subtle)" }}
      data-testid="sidebar"
    >
      {/* Brand header — strong portal identity */}
      <div
        className="px-4 py-4"
        style={{
          background: theme.headerBg,
          color: theme.headerFg,
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 28,
              height: 28,
              border: `1.5px solid ${theme.headerFg}`,
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
            <div className="mono-label" style={{ fontSize: 9.5, marginTop: 1, color: theme.headerFg, opacity: 0.85 }}>
              {theme.portalLabel}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-3 pt-3">
        <NavLink
          to="/tickets/new"
          data-testid="create-ticket-cta"
          className="w-full flex items-center justify-center gap-2 transition-colors"
          style={{
            background: theme.ctaBg,
            color: "#FAF9F6",
            padding: "9px 12px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = theme.ctaBgHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = theme.ctaBg)}
        >
          <Plus size={14} weight="bold" />
          {isAdmin ? "New Ticket" : "Raise a Ticket"}
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
          const activeStyle = isActive
            ? { background: theme.portalAccent, color: "#FAF9F6" }
            : {};
          return (
            <NavLink
              key={to}
              to={to}
              data-testid={item.testid}
              className="sidebar-item"
              style={activeStyle}
            >
              <Icon size={15} weight="duotone" />
              <span>{item.label}</span>
              {item.count !== undefined && item.count !== null && (
                <span className="sidebar-count" style={isActive ? { color: "#FAF9F6", opacity: 0.85 } : {}}>
                  {item.count}
                </span>
              )}
            </NavLink>
          );
        })}

        {/* Admin only: Preview employee */}
        {isAdmin && (
          <div className="px-3 pt-4 pb-2 mt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <button
              onClick={previewAsEmployee}
              disabled={previewing}
              className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-md transition-colors"
              style={{
                background: "var(--surface-hover)",
                color: "var(--text-secondary)",
                fontFamily: "IBM Plex Mono",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontSize: 10,
              }}
              data-testid="preview-employee-button"
            >
              <Eye size={12} />
              {previewing ? "Switching…" : "Preview as Employee"}
            </button>
          </div>
        )}
      </nav>

      {/* Footer: profile */}
      <div
        className="px-3 py-3 flex items-center gap-3"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div
          className="rounded-full overflow-hidden flex-shrink-0"
          style={{ width: 32, height: 32, background: theme.portalAccent }}
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
