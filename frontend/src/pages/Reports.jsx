import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { CircleNotch } from "@phosphor-icons/react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend, AreaChart, Area,
} from "recharts";

const DEPT_COLORS = ["#3A4B59", "#4A90E2", "#5CB85C", "#E6A23C", "#D9534F", "#8C8C8C", "#6B5B95"];
const STATUS_COLORS = { Open: "#4A90E2", "In Progress": "#4A90E2", Pending: "#E6A23C", Resolved: "#5CB85C", Closed: "#8C8C8C" };
const PRIO_COLORS = { Low: "#5CB85C", Medium: "#4A90E2", High: "#E6A23C", Urgent: "#D9534F" };

// Hoisted chart style constants
const TICK_LABEL = { fontSize: 11, fill: "#595959" };
const TICK_SECONDARY = { fontSize: 11, fill: "#8C8C8C" };
const TOOLTIP_STYLE = { background: "#FFF", border: "1px solid #E5E2DC", borderRadius: 6, fontSize: 12 };
const LEGEND_STYLE = { fontSize: 11 };
const PIE_CHART_MARGIN = { left: 10 };

export default function Reports() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data));
  }, []);

  if (!stats) {
    return (
      <div className="p-8 flex items-center gap-2 mono-label">
        <CircleNotch className="animate-spin" /> Loading reports…
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1500px]" data-testid="reports-page">
      <div className="mb-6">
        <div className="mono-label">Analytics</div>
        <h1 className="text-3xl font-semibold mt-1" style={{ fontFamily: "Cabinet Grotesk" }}>Reports</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Operational insights across departments, statuses and priorities.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Metric label="Total" value={stats.total} />
        <Metric label="Active" value={stats.active} />
        <Metric label="Resolved" value={stats.resolved} />
        <Metric label="Closed" value={stats.closed} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Chart title="Tickets by Department">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.by_department}>
              <CartesianGrid strokeDasharray="2 4" stroke="#E5E2DC" vertical={false} />
              <XAxis dataKey="department" tick={TICK_LABEL} axisLine={false} tickLine={false} />
              <YAxis tick={TICK_SECONDARY} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stats.by_department.map((entry, i) => <Cell key={entry.department} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Chart>

        <Chart title="Status Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={stats.by_status}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={2}
              >
                {stats.by_status.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#3A4B59"} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="square" wrapperStyle={LEGEND_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </Chart>

        <Chart title="Priority Mix">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.by_priority} layout="vertical" margin={PIE_CHART_MARGIN}>
              <CartesianGrid strokeDasharray="2 4" stroke="#E5E2DC" horizontal={false} />
              <XAxis type="number" tick={TICK_SECONDARY} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis dataKey="priority" type="category" tick={TICK_LABEL} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {stats.by_priority.map((entry) => <Cell key={entry.priority} fill={PRIO_COLORS[entry.priority] || "#3A4B59"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Chart>

        <Chart title="Trend · Last 7 Days">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats.trend_7d}>
              <defs>
                <linearGradient id="gradTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3A4B59" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3A4B59" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#E5E2DC" vertical={false} />
              <XAxis dataKey="date" tick={TICK_SECONDARY} axisLine={false} tickLine={false} />
              <YAxis tick={TICK_SECONDARY} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="count" stroke="#3A4B59" strokeWidth={2} fill="url(#gradTrend)" />
            </AreaChart>
          </ResponsiveContainer>
        </Chart>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="stat-card" data-testid={`report-metric-${label.toLowerCase()}`}>
      <div className="mono-label">{label}</div>
      <div className="mt-2 text-3xl font-semibold" style={{ fontFamily: "Cabinet Grotesk", letterSpacing: "-0.02em" }}>
        {value}
      </div>
    </div>
  );
}

function Chart({ title, children }) {
  return (
    <div className="card-flat p-5">
      <div className="mono-label">Breakdown</div>
      <h3 className="text-lg font-medium mt-1 mb-4" style={{ fontFamily: "Cabinet Grotesk" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
