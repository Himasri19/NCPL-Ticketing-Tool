import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Plus, Trash, CircleNotch } from "@phosphor-icons/react";

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = async () => {
    setLoading(true);
    const r = await api.get("/departments");
    setDepartments(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await api.post("/departments", form);
      setForm({ name: "", description: "" });
      toast.success("Department added");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this department?")) return;
    try {
      await api.delete(`/departments/${id}`);
      load();
      toast.success("Deleted");
    } catch (e) {
      toast.error("Failed");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl" data-testid="departments-page">
      <div className="mb-6">
        <div className="mono-label">Workspace</div>
        <h1 className="text-3xl font-semibold mt-1" style={{ fontFamily: "Cabinet Grotesk" }}>Departments</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Route tickets to the right team. HR, Sales, Training, Mentoring, Finance, and Hrudai are seeded by default.
        </p>
      </div>

      <form onSubmit={create} className="card-flat p-4 flex items-end gap-3 mb-6">
        <div className="flex-1">
          <label className="mono-label block mb-1.5">New Department</label>
          <input
            data-testid="new-dept-name"
            className="input-plain"
            placeholder="e.g. IT Support"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="flex-[2]">
          <label className="mono-label block mb-1.5">Description</label>
          <input
            data-testid="new-dept-desc"
            className="input-plain"
            placeholder="Short description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <button type="submit" className="btn-primary flex items-center gap-1.5" data-testid="add-dept-button">
          <Plus size={14} /> Add
        </button>
      </form>

      <div className="card-flat overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center gap-2 mono-label justify-center">
            <CircleNotch className="animate-spin" /> Loading…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="mono-label" style={{ textAlign: "left" }}>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id} style={{ borderTop: "1px solid var(--border-subtle)" }} data-testid={`dept-row-${d.name}`}>
                  <td className="py-3 px-4" style={{ fontWeight: 500 }}>{d.name}</td>
                  <td className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>{d.description || "—"}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => remove(d.id)}
                      className="text-xs hover:underline flex items-center gap-1 ml-auto"
                      style={{ color: "var(--status-urgent)" }}
                      data-testid={`delete-dept-${d.name}`}
                    >
                      <Trash size={12} /> Delete
                    </button>
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
