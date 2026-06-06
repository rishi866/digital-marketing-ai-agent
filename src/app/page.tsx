"use client";
import { useEffect, useState } from "react";

interface Stats {
  leads: { total: number; contacted: number; replied: number; converted: number };
  outreach: { total: number };
  followUps: { pending: number };
  content: { total: number };
  recentLeads: { businessName: string; status: string; score: number; createdAt: string }[];
  conversionRate: string;
  responseRate: string;
}

const statusColor: Record<string, string> = {
  new: "bg-slate-100 text-slate-600",
  contacted: "bg-blue-100 text-blue-700",
  replied: "bg-yellow-100 text-yellow-700",
  converted: "bg-green-100 text-green-700",
  dead: "bg-red-100 text-red-600",
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  const cards = [
    { label: "Total Leads", value: stats?.leads.total ?? 0, icon: "🎯", color: "blue" },
    { label: "Contacted", value: stats?.leads.contacted ?? 0, icon: "📧", color: "indigo" },
    { label: "Converted", value: stats?.leads.converted ?? 0, icon: "🏆", color: "green" },
    { label: "Conversion Rate", value: `${stats?.conversionRate ?? 0}%`, icon: "📈", color: "emerald" },
    { label: "Emails Sent", value: stats?.outreach.total ?? 0, icon: "✉️", color: "sky" },
    { label: "Response Rate", value: `${stats?.responseRate ?? 0}%`, icon: "💬", color: "violet" },
    { label: "Pending Follow-ups", value: stats?.followUps.pending ?? 0, icon: "🔄", color: "orange" },
    { label: "Content Pieces", value: stats?.content.total ?? 0, icon: "✍️", color: "pink" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-500 mt-1">Your agency client acquisition at a glance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{c.icon}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{c.value}</div>
            <div className="text-sm text-slate-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-4">Recent Leads</h3>
        {!stats?.recentLeads.length ? (
          <p className="text-slate-400 text-sm">No leads yet. Go to Lead Finder to generate some.</p>
        ) : (
          <div className="space-y-3">
            {stats.recentLeads.map((lead, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <div className="font-medium text-slate-800 text-sm">{lead.businessName}</div>
                  <div className="text-xs text-slate-400">{new Date(lead.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-slate-600">Score: {lead.score}</div>
                  <span className={`badge ${statusColor[lead.status] ?? "bg-slate-100"}`}>
                    {lead.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Quick Start", steps: ["1. Go to Lead Finder and generate leads", "2. Review and score your prospects", "3. Use Cold Outreach to send emails", "4. Schedule follow-ups automatically"] },
          { title: "Best Practices", steps: ["Target 1 niche at a time", "Personalize every email", "Follow up at least 3 times", "Track reply rates by industry"] },
          { title: "This Week's Goal", steps: ["Generate 50 new leads", "Send 20 personalized emails", "Schedule 10 follow-up sequences", "Create 5 content pieces"] },
        ].map((box) => (
          <div key={box.title} className="card">
            <h3 className="font-semibold text-slate-800 mb-3">{box.title}</h3>
            <ul className="space-y-1.5">
              {box.steps.map((step, i) => (
                <li key={i} className="text-sm text-slate-600">{step}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
