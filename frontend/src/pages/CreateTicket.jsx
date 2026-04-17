import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "sonner";
import { CircleNotch, ArrowLeft } from "@phosphor-icons/react";

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export default function CreateTicket() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", department: "", priority: "Medium" });
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    api.get("/departments").then((r) => {
      setDepartments(r.data);
      if (r.data[0]) setForm((f) => ({ ...f, department: r.data[0].name }));
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.department) {
      toast.error("Please fill title, description, and department.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/tickets", form);
      const ticket = res.data;
      // Upload attachments
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        await api.post(`/tickets/${ticket.id}/attachments`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      toast.success(`Ticket ${ticket.code} created.`);
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl" data-testid="create-ticket-page">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 mono-label mb-4 hover:underline"
        data-testid="back-button"
      >
        <ArrowLeft size={12} /> Back
      </button>

      <div className="mb-6">
        <div className="mono-label">New Ticket</div>
        <h1 className="text-3xl font-semibold mt-1" style={{ fontFamily: "Cabinet Grotesk" }}>
          Raise a request
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Provide a clear title and context. Route to the right department for fastest response.
        </p>
      </div>

      <form onSubmit={submit} className="card-flat p-6 space-y-5">
        <div>
          <label className="mono-label block mb-2">Title</label>
          <input
            data-testid="ticket-title-input"
            className="input-plain"
            placeholder="e.g. Laptop overheating during calls"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div>
          <label className="mono-label block mb-2">Description</label>
          <textarea
            data-testid="ticket-description-input"
            className="input-plain"
            rows={6}
            style={{ resize: "vertical" }}
            placeholder="Add as much detail as possible — steps to reproduce, expected vs actual, impact, urgency…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mono-label block mb-2">Department</label>
            <select
              data-testid="ticket-department-select"
              className="input-plain"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mono-label block mb-2">Priority</label>
            <select
              data-testid="ticket-priority-select"
              className="input-plain"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mono-label block mb-2">Attachments (optional, max 15MB each)</label>
          <input
            data-testid="ticket-attachments-input"
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
            className="text-sm"
            style={{ color: "var(--text-secondary)" }}
          />
          {files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {files.map((f) => (
                <span key={`${f.name}-${f.size}-${f.lastModified}`} className="badge-status" style={{ background: "var(--surface-hover)", color: "var(--text-primary)" }}>
                  {f.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary" data-testid="cancel-button">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-1.5" data-testid="submit-ticket-button">
            {submitting && <CircleNotch className="animate-spin" size={14} />}
            {submitting ? "Creating…" : "Create Ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}
