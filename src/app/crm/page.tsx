"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast, useToastAction } from "@/components/Toast";

interface Lead {
  id: string;
  businessName: string;
  industry?: string;
  location?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  status: string;
  source?: string;
  priority?: string;
  score: number;
  dealValue?: number;
  owner?: string;
  tags?: string;
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  createdAt: string;
  _count: { outreachLogs: number; followUps: number; activities?: number; tasks?: number };
}

interface Stats {
  total: number;
  newLeads: number;
  oldLeads: number;
  newThisWeek: number;
  statusGroups: { key: string; count: number }[];
  sourceGroups: { key: string; count: number }[];
  priorityGroups: { key: string; count: number }[];
  openTasks: number;
  overdueTasks: number;
  upcomingFollowups: number;
  pipelineValue: number;
  distinctTags: string[];
  recentActivities: { id: string; type: string; title: string; createdAt: string; lead: { id: string; businessName: string } }[];
}

const statusColor: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  replied: "bg-yellow-100 text-yellow-700",
  meeting: "bg-purple-100 text-purple-700",
  proposal_sent: "bg-orange-100 text-orange-700",
  converted: "bg-green-100 text-green-700",
  dead: "bg-red-100 text-red-600",
};

const priorityColor: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-red-100 text-red-700",
};

const STATUSES = ["all", "new", "contacted", "replied", "meeting", "proposal_sent", "converted", "dead"];
const NON_ALL_STATUSES = STATUSES.filter(s => s !== "all");
const SOURCES = ["", "manual", "csv", "ai", "google_maps", "referral", "social", "website", "other"];
const PRIORITIES = ["", "low", "medium", "high"];

type SmartPreset = "hot" | "today" | "stale" | "high_value" | "no_owner";

export default function CrmPage() {
  const toast = useToast();
  const toastAction = useToastAction();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [segment, setSegment] = useState<"" | "new" | "old">("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState("");
  const [tag, setTag] = useState("");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [idFrom, setIdFrom] = useState("");
  const [idTo, setIdTo] = useState("");
  const [preset, setPreset] = useState<SmartPreset | "">("");

  // Bulk select
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkValue, setBulkValue] = useState<string>("");

  const fetchAll = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    params.set("limit", "500");
    const [leadsRes, statsRes] = await Promise.all([
      fetch(`/api/leads?${params.toString()}`).then(r => r.json()),
      fetch(`/api/crm/stats`).then(r => r.json()),
    ]);
    setLeads(leadsRes.leads ?? []);
    setStats(statsRes);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status]);

  // Apply client-side filters
  const filtered = useMemo(() => {
    let list = [...leads];
    if (segment === "new") list = list.filter(l => l.status === "new");
    if (segment === "old") list = list.filter(l => l.status !== "new");
    if (source) list = list.filter(l => (l.source ?? "manual") === source);
    if (priority) list = list.filter(l => (l.priority ?? "medium") === priority);
    if (tag) list = list.filter(l => (l.tags ?? "").includes(tag));
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(l =>
        l.businessName.toLowerCase().includes(needle)
        || (l.email ?? "").toLowerCase().includes(needle)
        || (l.phone ?? "").toLowerCase().includes(needle)
        || (l.industry ?? "").toLowerCase().includes(needle)
        || (l.location ?? "").toLowerCase().includes(needle)
      );
    }
    if (dateFrom) {
      const d = new Date(dateFrom).getTime();
      list = list.filter(l => new Date(l.createdAt).getTime() >= d);
    }
    if (dateTo) {
      const d = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1;
      list = list.filter(l => new Date(l.createdAt).getTime() <= d);
    }
    // Smart presets (applied AFTER other filters)
    if (preset === "hot") list = list.filter(l => l.status === "replied" || l.status === "meeting");
    if (preset === "today") {
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      list = list.filter(l => l.nextFollowUpAt && new Date(l.nextFollowUpAt) <= todayEnd);
    }
    if (preset === "stale") {
      const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      list = list.filter(l => !["converted", "dead"].includes(l.status) && (!l.lastContactedAt || new Date(l.lastContactedAt).getTime() < fourteenDaysAgo));
    }
    if (preset === "high_value") list = list.filter(l => (l.dealValue ?? 0) >= 50000);
    if (preset === "no_owner") list = list.filter(l => !l.owner);

    // sort by createdAt ASC to give a stable "Lead #"
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const from = Number(idFrom);
    const to = Number(idTo);
    if (Number.isFinite(from) && from > 0) list = list.slice(from - 1);
    if (Number.isFinite(to) && to > 0) {
      const span = to - (Number.isFinite(from) && from > 0 ? from - 1 : 0);
      if (span > 0) list = list.slice(0, span);
    }
    return list;
  }, [leads, segment, source, priority, tag, q, dateFrom, dateTo, idFrom, idTo, preset]);

  const exportUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (segment) p.set("segment", segment);
    if (status && status !== "all") p.set("status", status);
    if (source) p.set("source", source);
    if (priority) p.set("priority", priority);
    if (tag) p.set("tag", tag);
    if (q.trim()) p.set("q", q.trim());
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    if (idFrom) p.set("idFrom", idFrom);
    if (idTo) p.set("idTo", idTo);
    return `/api/crm/export?${p.toString()}`;
  }, [segment, status, source, priority, tag, q, dateFrom, dateTo, idFrom, idTo]);

  const clearFilters = () => {
    setSegment(""); setStatus("all"); setSource(""); setPriority("");
    setTag(""); setQ(""); setDateFrom(""); setDateTo(""); setIdFrom(""); setIdTo(""); setPreset("");
  };

  const startIdx = Number(idFrom) > 0 ? Number(idFrom) - 1 : 0;

  // Bulk selection helpers
  const allOnPageSelected = filtered.length > 0 && filtered.every(l => selected.has(l.id));
  const toggleAll = () => {
    if (allOnPageSelected) {
      const next = new Set(selected);
      filtered.forEach(l => next.delete(l.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach(l => next.add(l.id));
      setSelected(next);
    }
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const runBulk = async () => {
    if (selected.size === 0 || !bulkAction) return;
    const ids = Array.from(selected);
    let payload: { ids: string[]; action: string; value?: string | number | string[] | null } = { ids, action: bulkAction };

    if (bulkAction === "setStatus" || bulkAction === "setPriority" || bulkAction === "setSource") {
      if (!bulkValue) { toast.error("Select a value first"); return; }
      payload.value = bulkValue;
    } else if (bulkAction === "setOwner") {
      payload.value = bulkValue || null;
    } else if (bulkAction === "addTags" || bulkAction === "removeTags") {
      const tags = bulkValue.split(",").map(s => s.trim()).filter(Boolean);
      if (tags.length === 0) { toast.error("Type at least one tag"); return; }
      payload.value = tags;
    } else if (bulkAction === "setDealValue") {
      payload.value = Number(bulkValue) || 0;
    } else if (bulkAction === "setFollowUp") {
      payload.value = bulkValue || null;
    } else if (bulkAction === "delete") {
      if (!confirm(`Delete ${ids.length} lead${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) return;
    } else if (bulkAction === "exportSelected") {
      // Build CSV from already-fetched data, client-side
      const rows = filtered.filter(l => selected.has(l.id));
      downloadSelectedCsv(rows, startIdx);
      toast.success(`Exported ${rows.length} leads`);
      return;
    }

    await toastAction(
      async () => {
        const res = await fetch("/api/crm/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Bulk action failed (${res.status})`);
        return res.json();
      },
      {
        loading: `Updating ${ids.length} leads…`,
        success: `Done — ${ids.length} lead${ids.length > 1 ? "s" : ""} updated`,
        error: "Bulk action failed",
      },
    );
    setBulkAction(""); setBulkValue("");
    await fetchAll();
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">CRM</h2>
          <p className="text-slate-500 mt-1">Manage leads, log activities, track tasks & download sheets</p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/board" className="btn-secondary">🗂 Board view</Link>
          <a href={exportUrl} className="btn-primary">⬇ Download Sheet (CSV)</a>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        {[
          { label: "Total Leads", value: stats?.total ?? 0, icon: "📇" },
          { label: "New Leads", value: stats?.newLeads ?? 0, icon: "🆕" },
          { label: "Old / Active", value: stats?.oldLeads ?? 0, icon: "🔄" },
          { label: "New (7 days)", value: stats?.newThisWeek ?? 0, icon: "✨" },
          { label: "Open Tasks", value: stats?.openTasks ?? 0, icon: "✅" },
          { label: "Overdue", value: stats?.overdueTasks ?? 0, icon: "⚠️" },
        ].map(c => (
          <div key={c.label} className="card !p-4">
            <div className="text-xl mb-1">{c.icon}</div>
            <div className="text-2xl font-bold text-slate-900">{c.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Smart presets */}
      <div className="card mb-4 !p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Quick view</span>
          {[
            { key: "hot", label: "🔥 Hot leads", desc: "Replied or in meeting" },
            { key: "today", label: "⏰ Due today", desc: "Follow-up scheduled today" },
            { key: "stale", label: "💤 Stale", desc: "No activity 14d+" },
            { key: "high_value", label: "💰 ₹50k+ deals", desc: "Deal value ≥ ₹50,000" },
            { key: "no_owner", label: "🧷 Unassigned", desc: "No owner set" },
          ].map(p => (
            <button key={p.key} onClick={() => setPreset(preset === p.key ? "" : p.key as SmartPreset)} title={p.desc}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                preset === p.key ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}>
              {p.label}
            </button>
          ))}
          {preset && (
            <button onClick={() => setPreset("")} className="text-xs text-slate-400 hover:text-slate-700 ml-1">clear preset</button>
          )}
        </div>
      </div>

      {/* Pipeline value + status breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card !p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <div className="text-xs text-green-700 font-medium uppercase tracking-wide">Won Pipeline Value</div>
          <div className="text-2xl font-bold text-green-700 mt-1">₹{(stats?.pipelineValue ?? 0).toLocaleString("en-IN")}</div>
        </div>
        <div className="card !p-4 bg-gradient-to-br from-blue-50 to-sky-50 border-blue-100">
          <div className="text-xs text-blue-700 font-medium uppercase tracking-wide">Follow-ups this week</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{stats?.upcomingFollowups ?? 0}</div>
        </div>
        <div className="card !p-4">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Status Breakdown</div>
          <div className="flex flex-wrap gap-1.5">
            {(stats?.statusGroups ?? []).map(g => (
              <button key={g.key} onClick={() => setStatus(g.key)}
                className={`text-xs px-2 py-1 rounded-full ${statusColor[g.key] ?? "bg-slate-100 text-slate-600"}`}>
                {g.key} · {g.count}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 text-sm">Filters</h3>
          <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-slate-700">Clear all</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <label className="label">Segment</label>
            <select className="input" value={segment} onChange={e => setSegment(e.target.value as "" | "new" | "old")}>
              <option value="">All</option>
              <option value="new">New leads only</option>
              <option value="old">Existing / Active</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Source</label>
            <select className="input" value={source} onChange={e => setSource(e.target.value)}>
              {SOURCES.map(s => <option key={s} value={s}>{s || "any"}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={priority} onChange={e => setPriority(e.target.value)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p || "any"}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tag</label>
            <select className="input" value={tag} onChange={e => setTag(e.target.value)}>
              <option value="">any</option>
              {(stats?.distinctTags ?? []).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Search</label>
            <input className="input" placeholder="name / email / phone..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div>
            <label className="label">Lead # From</label>
            <input className="input" type="number" min={1} placeholder="e.g. 1" value={idFrom} onChange={e => setIdFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Lead # To</label>
            <input className="input" type="number" min={1} placeholder="e.g. 100" value={idTo} onChange={e => setIdTo(e.target.value)} />
          </div>
          <div>
            <label className="label">Date From</label>
            <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Date To</label>
            <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="md:col-span-2 flex items-end">
            <div className="text-xs text-slate-500">
              Showing <strong className="text-slate-700">{filtered.length}</strong> of {leads.length} loaded.
              {(idFrom || idTo) && (
                <span className="ml-2 text-blue-600">Lead # range: {idFrom || 1} – {idTo || "end"}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk action toolbar (visible when something is selected) */}
      {selected.size > 0 && (
        <div className="card mb-4 !p-3 bg-indigo-50 border-indigo-200 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-indigo-900">{selected.size} selected</span>
          <button onClick={() => setSelected(new Set())} className="text-xs text-indigo-600 hover:text-indigo-800">clear</button>
          <div className="flex-1" />
          <select className="input !py-1.5 !w-auto text-sm" value={bulkAction} onChange={e => { setBulkAction(e.target.value); setBulkValue(""); }}>
            <option value="">Choose action…</option>
            <option value="setStatus">Change status</option>
            <option value="setPriority">Change priority</option>
            <option value="setSource">Change source</option>
            <option value="setOwner">Set owner</option>
            <option value="addTags">Add tags</option>
            <option value="removeTags">Remove tags</option>
            <option value="setDealValue">Set deal value</option>
            <option value="setFollowUp">Set follow-up date</option>
            <option value="exportSelected">Export selected to CSV</option>
            <option value="delete">Delete</option>
          </select>
          {(bulkAction === "setStatus") && (
            <select className="input !py-1.5 !w-auto text-sm" value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
              <option value="">value…</option>
              {NON_ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {(bulkAction === "setPriority") && (
            <select className="input !py-1.5 !w-auto text-sm" value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
              <option value="">value…</option>
              {PRIORITIES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          {(bulkAction === "setSource") && (
            <select className="input !py-1.5 !w-auto text-sm" value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
              <option value="">value…</option>
              {SOURCES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {(bulkAction === "setOwner") && (
            <input className="input !py-1.5 !w-40 text-sm" placeholder="email or name" value={bulkValue} onChange={e => setBulkValue(e.target.value)} />
          )}
          {(bulkAction === "addTags" || bulkAction === "removeTags") && (
            <input className="input !py-1.5 !w-48 text-sm" placeholder="tag1, tag2" value={bulkValue} onChange={e => setBulkValue(e.target.value)} />
          )}
          {(bulkAction === "setDealValue") && (
            <input className="input !py-1.5 !w-32 text-sm" type="number" placeholder="₹" value={bulkValue} onChange={e => setBulkValue(e.target.value)} />
          )}
          {(bulkAction === "setFollowUp") && (
            <input className="input !py-1.5 !w-auto text-sm" type="date" value={bulkValue} onChange={e => setBulkValue(e.target.value)} />
          )}
          <button onClick={runBulk} disabled={!bulkAction} className="btn-primary text-sm !py-1.5">Apply</button>
        </div>
      )}

      {/* Lead table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No leads match these filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-3 py-2.5 w-8">
                    <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} className="w-4 h-4" />
                  </th>
                  {["#", "Business", "Industry / Location", "Contact", "Status", "Priority", "Score", "Deal", "Tags", "Last Contact", "Next F/U", ""].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 font-medium text-slate-600 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((l, i) => {
                  let tags: string[] = [];
                  try { tags = JSON.parse(l.tags ?? "[]"); } catch { /* ignore */ }
                  const isSelected = selected.has(l.id);
                  const overdue = l.nextFollowUpAt && new Date(l.nextFollowUpAt).getTime() < Date.now();
                  return (
                    <tr key={l.id} className={`hover:bg-slate-50 ${isSelected ? "bg-indigo-50/40" : ""}`}>
                      <td className="px-3 py-2.5">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(l.id)} className="w-4 h-4" />
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 text-xs font-mono">{startIdx + i + 1}</td>
                      <td className="px-3 py-2.5">
                        <Link href={`/crm/${l.id}`} className="font-medium text-slate-800 hover:text-blue-600">
                          {l.businessName}
                        </Link>
                        {l.owner && <div className="text-xs text-slate-400">@{l.owner}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">
                        <div>{l.industry ?? "—"}</div>
                        <div className="text-slate-400">{l.location ?? "—"}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <div className="flex gap-1.5 items-center">
                          {l.email && <a href={`mailto:${l.email}`} title={l.email} className="hover:opacity-70">📧</a>}
                          {l.phone && <a href={`tel:${l.phone}`} title={l.phone} className="hover:opacity-70">📞</a>}
                          {l.whatsapp && <a href={l.whatsapp} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="hover:opacity-70">💬</a>}
                          {!l.email && !l.phone && !l.whatsapp && <span className="text-slate-300">—</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`badge ${statusColor[l.status] ?? "bg-slate-100"}`}>{l.status}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`badge ${priorityColor[l.priority ?? "medium"]}`}>{l.priority ?? "medium"}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${l.score}%` }} />
                          </div>
                          <span className="text-xs text-slate-600">{l.score}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-700">
                        {l.dealValue ? `₹${l.dealValue.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 flex-wrap max-w-32">
                          {tags.slice(0, 3).map(t => (
                            <span key={t} className="badge bg-indigo-50 text-indigo-700 text-[10px]">{t}</span>
                          ))}
                          {tags.length > 3 && <span className="text-xs text-slate-400">+{tags.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">
                        {l.lastContactedAt ? new Date(l.lastContactedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className={`px-3 py-2.5 text-xs ${overdue ? "text-red-500 font-semibold" : "text-slate-500"}`}>
                        {l.nextFollowUpAt ? new Date(l.nextFollowUpAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link href={`/crm/${l.id}`} className="text-blue-600 text-xs hover:text-blue-800">Open →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent activity */}
      {stats?.recentActivities && stats.recentActivities.length > 0 && (
        <div className="card mt-6">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {stats.recentActivities.map(a => (
              <Link key={a.id} href={`/crm/${a.lead.id}`}
                className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-2 -mx-2 rounded">
                <span className="text-lg">
                  {a.type === "note" ? "📝" : a.type === "call" ? "📞" : a.type === "email" ? "📧"
                    : a.type === "meeting" ? "🤝" : a.type === "sms" ? "💬" : a.type === "whatsapp" ? "💬" : "🔔"}
                </span>
                <div className="flex-1">
                  <div className="text-sm text-slate-800">{a.title}</div>
                  <div className="text-xs text-slate-400">{a.lead.businessName} · {new Date(a.createdAt).toLocaleString()}</div>
                </div>
                <span className="badge bg-slate-100 text-slate-600 text-xs capitalize">{a.type.replace("_", " ")}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function downloadSelectedCsv(rows: Lead[], startIdx: number) {
  const headers = [
    "Lead #", "Business Name", "Industry", "Location", "Email", "Phone", "WhatsApp",
    "Status", "Source", "Priority", "Score", "Deal Value", "Owner", "Tags",
    "Last Contacted", "Next Follow-up", "Created At",
  ];
  const csvEscape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const fmt = (d?: string) => d ? new Date(d).toISOString().slice(0, 19).replace("T", " ") : "";
  const sorted = [...rows].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const lines = sorted.map((l, i) => {
    let tags = "";
    try { tags = (JSON.parse(l.tags ?? "[]") as string[]).join(", "); } catch { tags = l.tags ?? ""; }
    return [
      startIdx + i + 1, l.businessName, l.industry ?? "", l.location ?? "",
      l.email ?? "", l.phone ?? "", l.whatsapp ?? "",
      l.status, l.source ?? "", l.priority ?? "", l.score,
      l.dealValue ?? 0, l.owner ?? "", tags,
      fmt(l.lastContactedAt), fmt(l.nextFollowUpAt), fmt(l.createdAt),
    ].map(csvEscape).join(",");
  });
  const csv = "﻿" + [headers.join(","), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads_selected_${rows.length}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
