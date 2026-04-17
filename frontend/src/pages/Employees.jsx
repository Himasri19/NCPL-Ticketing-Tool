import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { CircleNotch, UserCircle } from "@phosphor-icons/react";
import { initials, timeAgo } from "../lib/utils";

const ROLES = ["admin", "employee"];

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [e, d] = await Promise.all([api.get("/employees"), api.get("/departments")]);
    setEmployees(e.data);
    setDepartments(d.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (uid, patch) => {
    try {
      const res = await api.patch(`/employees/${uid}`, patch);
      setEmployees(employees.map((u) => (u.user_id === uid ? res.data : u)));
      toast.success("Updated");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Update failed");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px]" data-testid="employees-page">
      <div className="mb-6">
        <div className="mono-label">Workspace</div>
        <h1 className="text-3xl font-semibold mt-1" style={{ fontFamily: "Cabinet Grotesk" }}>Employees</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          New signups start as Employee. Promote to Admin here. Users appear after their first Google sign-in.
        </p>
      </div>

      <div className="card-flat overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center gap-2 mono-label justify-center">
            <CircleNotch className="animate-spin" /> Loading…
          </div>
        ) : employees.length === 0 ? (
          <div className="p-10 text-center">
            <UserCircle size={32} style={{ color: "var(--text-tertiary)", margin: "0 auto 8px" }} />
            <div className="mono-label">No Employees yet</div>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Employees appear here after they sign in with Google.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="mono-label" style={{ textAlign: "left" }}>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Joined</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((u) => (
                <tr key={u.user_id} style={{ borderTop: "1px solid var(--border-subtle)" }} data-testid={`employee-row-${u.email}`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--brand-primary)", color: "#FAF9F6", fontSize: 11, display: "grid", placeItems: "center" }}>
                        {initials(u.name)}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                  <td className="py-3 px-4">
                    <select
                      className="input-plain"
                      style={{ padding: "5px 8px", width: 120 }}
                      value={u.role}
                      onChange={(e) => update(u.user_id, { role: e.target.value })}
                      data-testid={`role-select-${u.email}`}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      className="input-plain"
                      style={{ padding: "5px 8px", width: 140 }}
                      value={u.department || ""}
                      onChange={(e) => update(u.user_id, { department: e.target.value })}
                      data-testid={`dept-select-${u.email}`}
                    >
                      <option value="">—</option>
                      {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </td>
                  <td className="py-3 px-4 text-xs" style={{ color: "var(--text-tertiary)" }}>{timeAgo(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
