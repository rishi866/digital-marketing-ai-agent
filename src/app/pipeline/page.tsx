"use client";
import { useEffect, useState } from "react";

interface Lead {
  id: string;
  businessName: string;
  industry?: string;
  location?: string;
  score: number;
  status: string;
  email?: string;
  phone?: string;
  rating?: number;
  updatedAt: string;
  _count: { outreachLogs: number; followUps: number };
}

const STAGES = [
  { key: "new",           label: "New",           color: "bg-slate-100 border-slate-300",  badge: "bg-slate-200 text-slate-700" },
  { key: "contacted",     label: "Contacted",     color: "bg-blue-50 border-blue-200",     badge: "bg-blue-100 text-blue-700" },
  { key: "replied",       label: "Replied",       color: "bg-yellow-50 border-yellow-200", badge: "bg-yellow-100 text-yellow-700" },
  { key: "meeting",       label: "Meeting",       color: "bg-purple-50 border-purple-200", badge: "bg-purple-100 text-purple-700" },
  { key: "proposal_sent", label: "Proposal Sent", color: "bg-orange-50 border-orange-200", badge: "bg-orange-100 text-orange-700" },
  { key: "converted",     label: "Won ✓",         color: "bg-green-50 border-green-200",   badge: "bg-green-100 text-green-700" },
  { key: "dead",          label: "Lost ✗",        color: "bg-red-50 border-red-200",       badge: "bg-red-100 text-red-600" },
];

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  const fetchLeads = async () => {
    const res = await fetch("/api/leads?limit=200");
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const moveStage = async (leadId: string, newStatus: string) => {
    setMovingId(leadId);
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, status: newStatus }),
    });
    await fetchLeads();
    setMovingId(null);
  };

  const byStage = (key: string) => leads.filter(l => l.status === key);

  const stats = {
    total: leads.length,
    won: byStage("converted").length,
    inProgress: leads.filter(l => !["new", "converted", "dead"].includes(l.status)).length,
    totalValue: byStage("converted").length * 15000,
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Sales Pipeline</h2>
        <p className="text-slate-500 mt-1">Drag leads through your sales stages</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Leads", value: stats.total, icon: "🎯" },
          { label: "In Progress", value: stats.inProgress, icon: "🔄" },
          { label: "Won Clients", value: stats.won, icon: "🏆" },
          { label: "Est. Value", value: `₹${stats.totalValue.toLocaleString("en-IN")}`, icon: "💰" },
        ].map(s => (
          <div key={s.label} className="card py-4">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? <div className="text-slate-400">Loading pipeline...</div> : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageLeads = byStage(stage.key);
            return (
              <div key={stage.key} className="flex-shrink-0 w-56">
                <div className={`rounded-xl border-2 ${stage.color} p-3 min-h-96`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-800 text-sm">{stage.label}</h3>
                    <span className={`badge ${stage.badge} text-xs`}>{stageLeads.length}</span>
                  </div>

                  <div className="space-y-2">
                    {stageLeads.map(lead => (
                      <div key={lead.id} className="bg-white rounded-lg p-3 shadow-sm border border-white hover:border-slate-200 transition-colors">
                        <p className="font-medium text-slate-800 text-xs leading-snug">{lead.businessName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{lead.industry ?? "—"}</p>

                        {lead.rating && (
                          <p className="text-xs text-yellow-500 mt-1">★ {lead.rating}</p>
                        )}

                        <div className="flex items-center gap-1 mt-2">
                          <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${lead.score}%` }} />
                          </div>
                          <span className="text-xs text-slate-400">{lead.score}</span>
                        </div>

                        <div className="flex gap-1 mt-2 flex-wrap">
                          {lead.email && <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded">📧</span>}
                          {lead.phone && <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded">📞</span>}
                          {lead._count.outreachLogs > 0 && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{lead._count.outreachLogs} sent</span>
                          )}
                        </div>

                        {/* Move buttons */}
                        <div className="flex gap-1 mt-2">
                          {STAGES.filter(s => s.key !== stage.key).slice(0, 3).map(s => (
                            <button key={s.key} onClick={() => moveStage(lead.id, s.key)}
                              disabled={movingId === lead.id}
                              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded transition-colors truncate max-w-14"
                              title={`Move to ${s.label}`}>
                              →{s.label.split(" ")[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {stageLeads.length === 0 && (
                      <div className="text-center py-6 text-slate-300 text-xs">Empty</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
