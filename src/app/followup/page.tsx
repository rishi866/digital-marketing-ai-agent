"use client";
import { useEffect, useState } from "react";

interface Lead {
  id: string;
  businessName: string;
  industry?: string;
  status: string;
}

interface FollowUp {
  id: string;
  message: string;
  scheduledAt: string;
  sentAt?: string;
  status: string;
  lead: { businessName: string };
}

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  sent: "bg-green-100 text-green-700",
  skipped: "bg-slate-100 text-slate-500",
};

export default function FollowUpPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [pending, setPending] = useState<FollowUp[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"schedule" | "pending" | "all">("schedule");
  const [analysis, setAnalysis] = useState("");
  const [thread, setThread] = useState("");

  const fetchAll = async () => {
    const [leadsData, fuData, pendData] = await Promise.all([
      fetch("/api/leads?limit=100").then((r) => r.json()),
      fetch("/api/followup").then((r) => r.json()),
      fetch("/api/followup?pending=true").then((r) => r.json()),
    ]);
    setLeads(leadsData.leads ?? []);
    setFollowUps(Array.isArray(fuData) ? fuData : []);
    setPending(Array.isArray(pendData) ? pendData : []);
  };

  useEffect(() => { fetchAll(); }, []);

  const scheduleSequence = async () => {
    if (!selectedLead) return;
    setLoading(true);
    await fetch("/api/followup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate_sequence",
        leadId: selectedLead.id,
        businessName: selectedLead.businessName,
        industry: selectedLead.industry,
      }),
    });
    await fetchAll();
    setLoading(false);
    alert("3-step follow-up sequence scheduled!");
  };

  const analyzeThread = async () => {
    if (!selectedLead || !thread) return;
    setLoading(true);
    const res = await fetch("/api/followup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "analyze",
        leadId: selectedLead.id,
        thread,
      }),
    });
    const data = await res.json();
    setAnalysis(data.analysis ?? "");
    setLoading(false);
  };

  const markSent = async (id: string) => {
    await fetch("/api/followup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_sent", id }),
    });
    await fetchAll();
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Follow-up Engine</h2>
        <p className="text-slate-500 mt-1">Automated follow-up sequences and conversation analysis</p>
      </div>

      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-800 font-medium text-sm">
            {pending.length} follow-up{pending.length > 1 ? "s" : ""} due now — check the Pending tab
          </p>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {[
          { key: "schedule", label: "Schedule Follow-ups" },
          { key: "pending", label: `Due Now (${pending.length})` },
          { key: "all", label: `All Follow-ups (${followUps.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "schedule" && (
        <div className="grid grid-cols-3 gap-6">
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-3">Select Lead</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
              {leads.filter((l) => l.status === "contacted" || l.status === "new").map((lead) => (
                <button key={lead.id} onClick={() => { setSelectedLead(lead); setAnalysis(""); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    selectedLead?.id === lead.id ? "bg-blue-600 text-white" : "hover:bg-slate-100 text-slate-700"
                  }`}>
                  <div className="font-medium">{lead.businessName}</div>
                  <div className={`text-xs mt-0.5 ${selectedLead?.id === lead.id ? "text-blue-100" : "text-slate-400"}`}>
                    {lead.industry ?? "Unknown"} · {lead.status}
                  </div>
                </button>
              ))}
            </div>
            {selectedLead && (
              <button onClick={scheduleSequence} disabled={loading} className="btn-primary w-full">
                {loading ? "Scheduling..." : "Schedule 3-Step Sequence"}
              </button>
            )}
          </div>

          <div className="col-span-2 space-y-4">
            <div className="card">
              <h3 className="font-semibold text-slate-800 mb-2">How it works</h3>
              <div className="space-y-3">
                {[
                  { step: "Day 3", title: "Follow-up #1", desc: "Friendly bump with a new value point" },
                  { step: "Day 10", title: "Follow-up #2", desc: "Share a relevant case study or result" },
                  { step: "Day 20", title: "Follow-up #3", desc: "Final check-in / breakup email to create urgency" },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded shrink-0">{s.step}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-800">{s.title}</div>
                      <div className="text-xs text-slate-500">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-slate-800 mb-3">Conversation Analyzer</h3>
              <p className="text-xs text-slate-500 mb-3">Paste the email thread and AI will recommend your next move</p>
              <textarea className="input mb-3" rows={5} placeholder="Paste the full email conversation here..."
                value={thread} onChange={(e) => setThread(e.target.value)} />
              <button onClick={analyzeThread} disabled={loading || !thread || !selectedLead} className="btn-primary">
                {loading ? "Analyzing..." : "Analyze Conversation"}
              </button>
              {analysis && (
                <div className="mt-4 bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap">
                  {analysis}
                </div>
              )}
              {!selectedLead && <p className="text-xs text-slate-400 mt-2">Select a lead first</p>}
            </div>
          </div>
        </div>
      )}

      {tab === "pending" && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="card text-center py-12 text-slate-400">No follow-ups due right now.</div>
          ) : pending.map((fu) => (
            <div key={fu.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-slate-800">{fu.lead.businessName}</span>
                    <span className={`badge ${statusColor[fu.status]}`}>{fu.status}</span>
                    <span className="text-xs text-red-500">Due: {new Date(fu.scheduledAt).toLocaleDateString()}</span>
                  </div>
                  <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans">{fu.message}</pre>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => navigator.clipboard.writeText(fu.message)} className="btn-secondary text-xs">
                    Copy
                  </button>
                  <button onClick={() => markSent(fu.id)} className="btn-primary text-xs">
                    Mark Sent
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "all" && (
        <div className="card p-0 overflow-hidden">
          {followUps.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No follow-ups scheduled yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Business", "Scheduled", "Sent", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {followUps.map((fu) => (
                  <tr key={fu.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{fu.lead.businessName}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(fu.scheduledAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-600">{fu.sentAt ? new Date(fu.sentAt).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusColor[fu.status] ?? "bg-slate-100"}`}>{fu.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {fu.status === "pending" && (
                        <button onClick={() => markSent(fu.id)} className="text-green-600 hover:text-green-800 text-xs">
                          Mark Sent
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
