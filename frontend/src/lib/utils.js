import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(iso);
}

export function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export const STATUS_STYLES = {
  Open: { bg: "var(--status-active-bg)", color: "var(--status-active)" },
  "In Progress": { bg: "var(--status-active-bg)", color: "var(--status-active)" },
  Pending: { bg: "var(--status-pending-bg)", color: "var(--status-pending)" },
  Resolved: { bg: "var(--status-resolved-bg)", color: "var(--status-resolved)" },
  Closed: { bg: "#EFEFEF", color: "#6B6B6B" },
};

export const PRIORITY_STYLES = {
  Low: { bg: "#F0F9F0", color: "#5CB85C" },
  Medium: { bg: "#EEF5FB", color: "#4A90E2" },
  High: { bg: "#FDF6EC", color: "#E6A23C" },
  Urgent: { bg: "#FDF0EF", color: "#D9534F" },
};
