"use client";
import { useEffect, useState } from "react";

interface Stats {
  leads: { total: number; contacted: number; replied: number; converted: number };
  outreach: { total: number };
  followUps: { pending: number };
  content: { total: number };
  conversionRate: string;
  responseRate: string;
  recentLeads: { businessName: string; status: string; score: number; createdAt: string }[];
}

interface ExtendedStats {
  byIndustry: { industry: string; count: number; converted: number }[];
  staleLeads: { businessName: string; industry?: string; updatedAt: string }[];
  dueFollowUps: { lead: { businessName: string }; scheduledAt: string; message: string }[];
  topLeads: { businessName: string; score: number; status: string; industry?: string }[];
  weeklyOutreach: number;
  pipelineValue: number;
}

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ext, setExt] = useState<ExtendedStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then(r => r.json()),
      fetch("/api/reports").then(r => r.json()),
    ]).then(([s, e]) => { setStats(s); setExt(e); setLoading(false); });
  }, []);

  if (loading) return <div className="p-8 text-slate-400">Loading reports...</div>;

  const digest = [
    ext?.dueFollowUps.length ? `🔔 ${ext.dueFollowUps.length} follow-up${ext.dueFollowUps.length > 1 ? "s" : ""} due today` : null,
    ext?.staleLeads.length ? `⚠️ ${ext.staleLeads.length} lead${ext.staleLeads.length > 1 ? "s" : ""} not contacted in 7+ days` : null,
    stats?.leads.replied ? `💬 ${stats.leads.replied} lead${stats.leads.replied > 1 ? "s" : ""} have replied — respond now` : null,
    stats?.conversionRate ? `📈 Conversion rate: ${stats.conversionRate}%` : null,
  ].filter(Boolean);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Reports & Analytics</h2>
        <p className="text-slate-500 mt-1">Your agency performance at a glance</p>
      </div>

      {/* Daily Digest */}
      {digest.length > 0 && (
        <div className="card bg-blue-900 border-blue-800 mb-6">
          <h3 className="font-semibold text-white mb-3">📋 Today's Action Items</h3>
          <div className="space-y-2">
            {digest.map((item, i) => (
              <div key={i} className="bg-blue-800/50 rounded-lg px-4 py-2.5 text-sm text-blue-100">{item}</div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Leads", value: stats?.leads.total ?? 0, sub: "All time", icon: "🎯", color: "blue" },
          { label: "Emails Sent", value: stats?.outreach.total ?? 0, sub: `This week: ${ext?.weeklyOutreach ?? 0}`, icon: "📧", color: "indigo" },
          { label: "Reply Rate", value: `${stats?.responseRate ?? 0}%`, sub: `${stats?.leads.replied ?? 0} replied`, icon: "💬", color: "yellow" },
          { label: "Conversion Rate", value: `${stats?.conversionRate ?? 0}%`, sub: `${stats?.leads.converted ?? 0} won`, icon: "🏆", color: "green" },
          { label: "Pipeline Value", value: `₹${((ext?.pipelineValue ?? 0)).toLocaleString("en-IN")}`, sub: "Est. monthly revenue", icon: "💰", color: "emerald" },
          { label: "Content Created", value: stats?.content.total ?? 0, sub: "Posts, blogs, ads", icon: "✍️", color: "purple" },
          { label: "Follow-ups Due", value: stats?.followUps.pending ?? 0, sub: "Action needed", icon: "🔄", color: "orange" },
          { label: "Contacted", value: stats?.leads.contacted ?? 0, sub: `${stats?.leads.total ? Math.round((stats.leads.contacted / stats.leads.total) * 100) : 0}% of leads`, icon: "📨", color: "sky" },
        ].map(k => (
          <div key={k.label} className="card py-4">
            <span className="text-2xl">{k.icon}</span>
            <div className="text-2xl font-bold text-slate-900 mt-2">{k.value}</div>
            <div className="text-xs font-medium text-slate-700">{k.label}</div>
            <div className="text-xs text-slate-400">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* By Industry */}
        {ext?.byIndustry && ext.byIndustry.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4">📊 Leads by Industry</h3>
            <div className="space-y-3">
              {ext.byIndustry.slice(0, 8).map((row, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-700 truncate">{row.industry || "Unknown"}</span>
                    <span className="text-slate-500">{row.count} leads</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.round((row.count / (stats?.leads.total || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Leads */}
        {ext?.topLeads && (
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4">🔥 Top Scored Leads</h3>
            <div className="space-y-2.5">
              {ext.topLeads.map((lead, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-400 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{lead.businessName}</p>
                    <p className="text-xs text-slate-400">{lead.industry ?? "Unknown"}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-600">{lead.score}</div>
                    <div className="text-xs text-slate-400">{lead.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stale Leads */}
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4">⚠️ Needs Attention</h3>
          {!ext?.staleLeads.length ? (
            <p className="text-slate-400 text-sm">All leads contacted recently. Great work!</p>
          ) : (
            <div className="space-y-2">
              {ext.staleLeads.slice(0, 6).map((lead, i) => {
                const days = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / 86400000);
                return (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{lead.businessName}</p>
                      <p className="text-xs text-slate-400">{lead.industry ?? "Unknown"}</p>
                    </div>
                    <span className="text-xs text-red-500 font-medium">{days}d ago</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Due Follow-ups */}
      {ext?.dueFollowUps && ext.dueFollowUps.length > 0 && (
        <div className="card mt-6">
          <h3 className="font-semibold text-slate-800 mb-4">🔔 Follow-ups Due Now ({ext.dueFollowUps.length})</h3>
          <div className="space-y-3">
            {ext.dueFollowUps.map((fu, i) => (
              <div key={i} className="flex items-start gap-4 p-3 bg-amber-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">{fu.lead.businessName}</p>
                  <p className="text-xs text-amber-600 mt-0.5 line-clamp-2">{fu.message.slice(0, 120)}...</p>
                </div>
                <button onClick={() => navigator.clipboard.writeText(fu.message)} className="text-amber-600 text-xs hover:text-amber-800">Copy</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
