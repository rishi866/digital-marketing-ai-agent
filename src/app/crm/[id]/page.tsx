"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Lead {
  id: string;
  businessName: string;
  industry?: string;
  location?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  status: string;
  source?: string;
  priority?: string;
  score: number;
  dealValue?: number;
  owner?: string;
  tags?: string;
  notes?: string;
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  createdAt: string;
}

interface Activity {
  id: string;
  type: string;
  title: string;
  body?: string;
  createdAt: string;
  createdBy?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  dueAt?: string;
  completedAt?: string;
  priority: string;
  createdAt: string;
}

const STATUSES = ["new", "contacted", "replied", "meeting", "proposal_sent", "converted", "dead"];
const SOURCES = ["manual", "csv", "ai", "google_maps", "referral", "social", "website", "other"];
const PRIORITIES = ["low", "medium", "high"];

const activityTypeIcon: Record<string, string> = {
  note: "📝", call: "📞", email: "📧", meeting: "🤝", sms: "💬", whatsapp: "💬", status_change: "🔄",
};

const statusColor: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  replied: "bg-yellow-100 text-yellow-700",
  meeting: "bg-purple-100 text-purple-700",
  proposal_sent: "bg-orange-100 text-orange-700",
  converted: "bg-green-100 text-green-700",
  dead: "bg-red-100 text-red-600",
};

export default function CrmLeadDetailPage() {
  const params = useParams<{ id: string }>();
  const leadId = params.id;

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState<string | null>(null);

  // Activity composer
  const [newActivityType, setNewActivityType] = useState("note");
  const [newActivityTitle, setNewActivityTitle] = useState("");
  const [newActivityBody, setNewActivityBody] = useState("");

  // Task composer
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");

  // CRM field local edits
  const [tagsInput, setTagsInput] = useState("");
  const [owner, setOwner] = useState("");
  const [dealValue, setDealValue] = useState(0);
  const [nextFollowUp, setNextFollowUp] = useState("");

  const fetchAll = async () => {
    const [leadRes, actRes, taskRes] = await Promise.all([
      fetch(`/api/leads?limit=500`).then(r => r.json()),
      fetch(`/api/crm/activities?leadId=${leadId}`).then(r => r.json()),
      fetch(`/api/crm/tasks?leadId=${leadId}`).then(r => r.json()),
    ]);
    const found = (leadRes.leads as Lead[]).find(l => l.id === leadId) ?? null;
    setLead(found);
    if (found) {
      let tagList: string[] = [];
      try { tagList = JSON.parse(found.tags ?? "[]"); } catch { /* ignore */ }
      setTagsInput(tagList.join(", "));
      setOwner(found.owner ?? "");
      setDealValue(found.dealValue ?? 0);
      setNextFollowUp(found.nextFollowUpAt ? found.nextFollowUpAt.slice(0, 10) : "");
    }
    setActivities(actRes.activities ?? []);
    setTasks(taskRes.tasks ?? []);
    setLoading(false);
  };

  useEffect(() => { if (leadId) fetchAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [leadId]);

  const tagArray = useMemo(() =>
    tagsInput.split(",").map(t => t.trim()).filter(Boolean),
    [tagsInput],
  );

  const patchLead = async (data: Record<string, unknown>, field: string) => {
    setSavingField(field);
    await fetch(`/api/leads`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, ...data }),
    });
    await fetchAll();
    setSavingField(null);
  };

  const addActivity = async () => {
    if (!newActivityTitle.trim()) return;
    await fetch(`/api/crm/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        type: newActivityType,
        title: newActivityTitle.trim(),
        bodyText: newActivityBody.trim() || null,
      }),
    });
    setNewActivityTitle("");
    setNewActivityBody("");
    setNewActivityType("note");
    await fetchAll();
  };

  const deleteActivity = async (id: string) => {
    if (!confirm("Delete this entry from timeline?")) return;
    await fetch(`/api/crm/activities?id=${id}`, { method: "DELETE" });
    await fetchAll();
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    await fetch(`/api/crm/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        title: newTaskTitle.trim(),
        dueAt: newTaskDue || null,
        priority: newTaskPriority,
      }),
    });
    setNewTaskTitle("");
    setNewTaskDue("");
    setNewTaskPriority("medium");
    await fetchAll();
  };

  const toggleTask = async (id: string) => {
    await fetch(`/api/crm/tasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, toggleComplete: true }),
    });
    await fetchAll();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/crm/tasks?id=${id}`, { method: "DELETE" });
    await fetchAll();
  };

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>;
  if (!lead) return (
    <div className="p-8">
      <Link href="/crm" className="text-sm text-blue-600">← Back to CRM</Link>
      <div className="mt-4 text-slate-500">Lead not found.</div>
    </div>
  );

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-4">
        <Link href="/crm" className="text-sm text-blue-600 hover:text-blue-800">← Back to CRM</Link>
      </div>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{lead.businessName}</h1>
            <p className="text-slate-500 text-sm mt-1">{lead.industry ?? "—"} · {lead.location ?? "—"}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`badge ${statusColor[lead.status] ?? "bg-slate-100"}`}>{lead.status}</span>
              <span className="badge bg-indigo-100 text-indigo-700">Score {lead.score}/100</span>
              {lead.source && <span className="badge bg-slate-100 text-slate-600">Source: {lead.source}</span>}
              <span className="badge bg-slate-100 text-slate-600">Created {new Date(lead.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <select
              className={`badge ${statusColor[lead.status] ?? "bg-slate-100"} cursor-pointer text-xs`}
              value={lead.status}
              onChange={e => patchLead({ status: e.target.value }, "status")}
              disabled={savingField === "status"}
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              className="badge bg-slate-100 text-slate-700 cursor-pointer text-xs"
              value={lead.priority ?? "medium"}
              onChange={e => patchLead({ priority: e.target.value }, "priority")}
              disabled={savingField === "priority"}
            >
              {PRIORITIES.map(p => <option key={p} value={p}>{p} priority</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: CRM fields */}
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Deal & Owner</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Estimated Deal Value (₹)</label>
                <div className="flex gap-2">
                  <input className="input" type="number" min={0}
                    value={dealValue}
                    onChange={e => setDealValue(Number(e.target.value))}
                  />
                  <button className="btn-secondary text-sm" disabled={savingField === "dealValue"}
                    onClick={() => patchLead({ dealValue }, "dealValue")}>Save</button>
                </div>
              </div>
              <div>
                <label className="label">Owner / Assignee</label>
                <div className="flex gap-2">
                  <input className="input" placeholder="you@agency.com" value={owner} onChange={e => setOwner(e.target.value)} />
                  <button className="btn-secondary text-sm" disabled={savingField === "owner"}
                    onClick={() => patchLead({ owner: owner || null }, "owner")}>Save</button>
                </div>
              </div>
              <div>
                <label className="label">Source</label>
                <select className="input" value={lead.source ?? "manual"} disabled={savingField === "source"}
                  onChange={e => patchLead({ source: e.target.value }, "source")}>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Next Follow-up Date</label>
                <div className="flex gap-2">
                  <input className="input" type="date" value={nextFollowUp} onChange={e => setNextFollowUp(e.target.value)} />
                  <button className="btn-secondary text-sm" disabled={savingField === "nextFollowUpAt"}
                    onClick={() => patchLead({ nextFollowUpAt: nextFollowUp || null }, "nextFollowUpAt")}>Save</button>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Tags</h3>
            <div className="flex flex-wrap gap-1.5 mb-3 min-h-6">
              {tagArray.length === 0 ? (
                <span className="text-xs text-slate-400">No tags yet</span>
              ) : tagArray.map(t => (
                <span key={t} className="badge bg-indigo-50 text-indigo-700 text-xs">{t}</span>
              ))}
            </div>
            <textarea className="input text-xs" rows={2}
              placeholder="comma-separated, e.g. hot, instagram, referral"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
            />
            <button className="btn-secondary text-sm mt-2 w-full" disabled={savingField === "tags"}
              onClick={() => patchLead({ tags: tagArray }, "tags")}>
              Save tags
            </button>
          </div>

          {/* Contact */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Contact</h3>
            <div className="space-y-1.5 text-sm">
              {[
                { label: "Email", value: lead.email, icon: "📧" },
                { label: "Phone", value: lead.phone, icon: "📞" },
                { label: "WhatsApp", value: lead.whatsapp, icon: "💬", isLink: true },
                { label: "Website", value: lead.website, icon: "🌐", isLink: true },
                { label: "Instagram", value: lead.instagram, icon: "📸", isLink: true },
                { label: "Facebook", value: lead.facebook, icon: "👥", isLink: true },
                { label: "LinkedIn", value: lead.linkedin, icon: "💼", isLink: true },
              ].map(c => c.value ? (
                <div key={c.label} className="flex items-center gap-2 text-xs">
                  <span>{c.icon}</span>
                  <span className="text-slate-500 w-16">{c.label}</span>
                  {c.isLink ? (
                    <a href={c.value} target="_blank" rel="noopener noreferrer" className="text-blue-600 truncate flex-1 hover:underline">{c.value}</a>
                  ) : (
                    <span className="text-slate-700 truncate flex-1">{c.value}</span>
                  )}
                </div>
              ) : null)}
            </div>
          </div>
        </div>

        {/* Right: Activities + Tasks */}
        <div className="md:col-span-2 space-y-4">
          {/* Add activity */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Log Activity</h3>
            <div className="flex gap-2 mb-2">
              {["note", "call", "email", "meeting", "sms", "whatsapp"].map(t => (
                <button key={t} onClick={() => setNewActivityType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                    newActivityType === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}>
                  {activityTypeIcon[t]} {t}
                </button>
              ))}
            </div>
            <input className="input mb-2"
              placeholder="Short title — e.g. Called, no answer / Sent intro email / Meeting at 3pm"
              value={newActivityTitle} onChange={e => setNewActivityTitle(e.target.value)} />
            <textarea className="input mb-2" rows={2} placeholder="Optional details / notes"
              value={newActivityBody} onChange={e => setNewActivityBody(e.target.value)} />
            <button onClick={addActivity} className="btn-primary text-sm w-full" disabled={!newActivityTitle.trim()}>
              + Log {newActivityType}
            </button>
          </div>

          {/* Timeline */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Activity Timeline ({activities.length})</h3>
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400">No activities logged yet. Use the form above.</p>
            ) : (
              <div className="space-y-3">
                {activities.map(a => (
                  <div key={a.id} className="flex items-start gap-3 border-l-2 border-slate-200 pl-3 py-1 group hover:border-blue-400">
                    <span className="text-lg leading-none">{activityTypeIcon[a.type] ?? "🔔"}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{a.title}</span>
                        <span className="badge bg-slate-100 text-slate-500 text-[10px] capitalize">{a.type.replace("_", " ")}</span>
                      </div>
                      {a.body && <p className="text-xs text-slate-600 whitespace-pre-wrap mt-1">{a.body}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(a.createdAt).toLocaleString()}{a.createdBy ? ` · ${a.createdBy}` : ""}
                      </p>
                    </div>
                    <button onClick={() => deleteActivity(a.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs transition-opacity">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Tasks ({tasks.filter(t => !t.completedAt).length} open)</h3>
            <div className="flex gap-2 mb-3">
              <input className="input" placeholder="Task title — e.g. Send proposal" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
              <input className="input max-w-40" type="date" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)} />
              <select className="input max-w-32" value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button onClick={addTask} className="btn-primary text-sm" disabled={!newTaskTitle.trim()}>+ Add</button>
            </div>

            {tasks.length === 0 ? (
              <p className="text-xs text-slate-400">No tasks yet.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map(t => {
                  const overdue = !t.completedAt && t.dueAt && new Date(t.dueAt).getTime() < Date.now();
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                      <input type="checkbox" checked={!!t.completedAt} onChange={() => toggleTask(t.id)} className="w-4 h-4" />
                      <div className="flex-1">
                        <div className={`text-sm ${t.completedAt ? "line-through text-slate-400" : "text-slate-800"}`}>{t.title}</div>
                        <div className="text-xs text-slate-400 flex gap-2">
                          {t.dueAt && (
                            <span className={overdue ? "text-red-500 font-medium" : ""}>
                              Due {new Date(t.dueAt).toLocaleDateString()}{overdue ? " (overdue)" : ""}
                            </span>
                          )}
                          <span className="badge bg-slate-100 text-slate-500 text-[10px] capitalize">{t.priority}</span>
                        </div>
                      </div>
                      <button onClick={() => deleteTask(t.id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes (existing single Lead.notes field) */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Lead Notes</h3>
            <NotesEditor leadId={lead.id} initial={lead.notes ?? ""} onSaved={fetchAll} />
          </div>
        </div>
      </div>
    </div>
  );
}

function NotesEditor({ leadId, initial, onSaved }: { leadId: string; initial: string; onSaved: () => void }) {
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setText(initial); }, [initial]);
  return (
    <div>
      <textarea className="input" rows={4} value={text} onChange={e => setText(e.target.value)}
        placeholder="Free-form notes about this lead..." />
      <button onClick={async () => {
        setSaving(true);
        await fetch(`/api/leads`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: leadId, notes: text }),
        });
        setSaving(false);
        onSaved();
      }} disabled={saving} className="btn-secondary text-sm mt-2">
        {saving ? "Saving…" : "Save notes"}
      </button>
    </div>
  );
}
