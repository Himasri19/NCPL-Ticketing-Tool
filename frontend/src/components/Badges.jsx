import React from "react";
import { STATUS_STYLES, PRIORITY_STYLES } from "../lib/utils";

export function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES["Open"];
  return (
    <span className="badge-status" style={{ background: s.bg, color: s.color }} data-testid={`status-${status.toLowerCase().replace(/\s+/g, "-")}`}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const p = PRIORITY_STYLES[priority] || PRIORITY_STYLES["Medium"];
  return (
    <span className="badge-status" style={{ background: p.bg, color: p.color }} data-testid={`priority-${priority.toLowerCase()}`}>
      {priority}
    </span>
  );
}
