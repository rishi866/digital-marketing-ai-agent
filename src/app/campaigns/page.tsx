"use client";
import { useEffect, useState } from "react";

interface Lead { id: string; businessName: string; industry?: string; location?: string; email?: string; status: string; score: number; }
interface Campaign { id: string; name: string; status: string; totalLeads: number; contacted: number; _count: { bulkEmails: number }; createdAt: string; }
interface BulkEmail { id: string; subject: string; body: string; status: string; lead: { businessName: string; email?: string; industry?: string }; }

export default function CampaignsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [campaignName, setCampaignName] = useState("");
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [emails, setEmails] = useState<BulkEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<"create" | "manage">("create");
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  useEffect(() => {
    fetch("/api/leads?limit=200").then(r => r.json()).then(d => setLeads(d.leads ?? []));
    fetch("/api/campaigns").then(r => r.json()).then(setCampaigns);
  }, []);

  const toggleLead = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const createAndGenerate = async () => {
    if (!campaignName || selected.size === 0) return;
    setGenerating(true);

    // Create campaign
    const campRes = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_campaign", name: campaignName, leadIds: [...selected] }),
    });
    const camp = await campRes.json();

    // Generate emails
    await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate_emails", campaignId: camp.id, leadIds: [...selected] }),
    });

    const updatedCamps = await fetch("/api/campaigns").then(r => r.json());
    setCampaigns(updatedCamps);
    setActiveCampaign(camp);

    // Load emails
    const emailRes = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_emails", campaignId: camp.id }),
    });
    setEmails(await emailRes.json());
    setGenerating(false);
    setTab("manage");
  };

  const loadCampaignEmails = async (campaign: Campaign) => {
    setActiveCampaign(campaign);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_emails", campaignId: campaign.id }),
    });
    setEmails(await res.json());
    setTab("manage");
  };

  const approveAll = async () => {
    setLoading(true);
    await Promise.all(emails.filter(e => e.status === "pending").map(e =>
      fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_email", emailId: e.id }) })
    ));
    setEmails(prev => prev.map(e => ({ ...e, status: e.status === "pending" ? "approved" : e.status })));
    setLoading(false);
  };

  const saveEdit = async (id: string) => {
    await fetch("/api/campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, body: editBody }) });
    setEmails(prev => prev.map(e => e.id === id ? { ...e, body: editBody } : e));
    setEditingEmail(null);
  };

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    sent: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Bulk Outreach Campaigns</h2>
        <p className="text-slate-500 mt-1">Select leads → AI writes personalized emails → review → send</p>
      </div>

      <div className="flex gap-2 mb-6">
        {[{ key: "create", label: "Create Campaign" }, { key: "manage", label: `Review Queue${activeCampaign ? ` — ${activeCampaign.name}` : ""}` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "create" && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Select Leads for Campaign</h3>
              <div className="flex gap-2">
                <button onClick={() => setSelected(new Set(leads.map(l => l.id)))} className="btn-secondary text-xs">Select All</button>
                <button onClick={() => setSelected(new Set())} className="btn-secondary text-xs">Clear</button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-1">
              {leads.map(lead => (
                <div key={lead.id} onClick={() => toggleLead(lead.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${selected.has(lead.id) ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50 border border-transparent"}`}>
                  <input type="checkbox" readOnly checked={selected.has(lead.id)} className="rounded" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{lead.businessName}</p>
                    <p className="text-xs text-slate-400">{lead.industry} · {lead.location}</p>
                  </div>
                  {lead.email ? <span className="text-xs text-green-600">✓ email</span> : <span className="text-xs text-slate-300">no email</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-slate-800 mb-3">Campaign Settings</h3>
              <div className="mb-4">
                <label className="label">Campaign Name</label>
                <input className="input" placeholder="Varanasi Restaurants June" value={campaignName} onChange={e => setCampaignName(e.target.value)} />
              </div>
              <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm text-blue-700">
                <p className="font-medium">{selected.size} leads selected</p>
                <p className="text-xs text-blue-500 mt-0.5">Claude will write a personalized email for each one</p>
              </div>
              <button onClick={createAndGenerate} disabled={generating || selected.size === 0 || !campaignName} className="btn-primary w-full">
                {generating ? `Generating ${selected.size} emails...` : `Generate ${selected.size} Emails`}
              </button>
            </div>

            <div className="card">
              <h3 className="font-semibold text-slate-800 mb-3">Past Campaigns</h3>
              {campaigns.length === 0 ? <p className="text-slate-400 text-sm">No campaigns yet</p> :
                campaigns.map(c => (
                  <div key={c.id} onClick={() => loadCampaignEmails(c)}
                    className="py-2 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded">
                    <p className="text-sm font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">{c._count.bulkEmails} emails · {new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {tab === "manage" && (
        <div>
          {emails.length === 0 ? (
            <div className="card text-center py-12 text-slate-400">
              <p>No emails yet. Create a campaign first.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600">{emails.length} emails · {emails.filter(e => e.status === "approved").length} approved · {emails.filter(e => e.status === "pending").length} pending review</p>
                <button onClick={approveAll} disabled={loading} className="btn-primary">
                  {loading ? "Approving..." : "Approve All"}
                </button>
              </div>
              <div className="space-y-4">
                {emails.map(email => (
                  <div key={email.id} className="card">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-slate-800">{email.lead.businessName}</p>
                        <p className="text-xs text-slate-400">{email.lead.industry} · {email.lead.email ?? "No email"}</p>
                      </div>
                      <span className={`badge ${statusColor[email.status] ?? "bg-slate-100"}`}>{email.status}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Subject: {email.subject}</p>
                    {editingEmail === email.id ? (
                      <div>
                        <textarea className="input text-sm" rows={8} value={editBody} onChange={e => setEditBody(e.target.value)} />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => saveEdit(email.id)} className="btn-primary text-xs">Save</button>
                          <button onClick={() => setEditingEmail(null)} className="btn-secondary text-xs">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap max-h-36 overflow-y-auto">{email.body}</div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => { setEditingEmail(email.id); setEditBody(email.body); }} className="btn-secondary text-xs">Edit</button>
                      <button onClick={() => navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`)} className="btn-secondary text-xs">Copy</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
