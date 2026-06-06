"use client";
import { useEffect, useState } from "react";

interface Lead {
  id: string;
  businessName: string;
  website?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  industry?: string;
  location?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  mapUrl?: string;
  notes?: string;
  status: string;
  score: number;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  twitter?: string;
  gmb?: string;
  gmbRank?: number;
  websiteScore?: number;
  socialScore?: number;
  gaps?: string;
  weaknesses?: string;
  outreachAngle?: string;
  lastResearched?: string;
  createdAt: string;
  _count: { outreachLogs: number; followUps: number };
}

const statusColor: Record<string, string> = {
  new: "bg-slate-100 text-slate-600",
  contacted: "bg-blue-100 text-blue-700",
  replied: "bg-yellow-100 text-yellow-700",
  converted: "bg-green-100 text-green-700",
  dead: "bg-red-100 text-red-600",
};

function ScoreBar({ score, label }: { score?: number; label: string }) {
  if (score === undefined || score === null) return null;
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-24">{label}</span>
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-700 w-8 text-right">{score}%</span>
    </div>
  );
}

function SocialLink({ url, label, icon }: { url?: string; label: string; icon: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${url ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
      <span>{icon}</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline max-w-40">
          {label}
        </a>
      ) : (
        <span className="text-red-500">No {label}</span>
      )}
      {url ? <span className="ml-auto text-green-600 text-xs">✓</span> : <span className="ml-auto text-red-500 text-xs">✗</span>}
    </div>
  );
}

function LeadProfile({ lead, onClose, onUpdate }: { lead: Lead; onClose: () => void; onUpdate: () => void }) {
  const [researching, setResearching] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    website: lead.website ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    whatsapp: lead.whatsapp ?? "",
    instagram: lead.instagram ?? "",
    facebook: lead.facebook ?? "",
    linkedin: lead.linkedin ?? "",
    youtube: lead.youtube ?? "",
    twitter: lead.twitter ?? "",
    gmb: lead.gmb ?? "",
    notes: lead.notes ?? "",
  });

  const gaps = lead.gaps ? (JSON.parse(lead.gaps) as string[]) : [];

  const runResearch = async () => {
    setResearching(true);
    await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id }),
    });
    onUpdate();
    setResearching(false);
  };

  const saveManual = async () => {
    await fetch("/api/research", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lead.id, ...form }),
    });
    setEditMode(false);
    onUpdate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end" onClick={onClose}>
      <div className="bg-white h-full w-full max-w-2xl overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{lead.businessName}</h2>
              <p className="text-slate-300 text-sm mt-1">{lead.industry} · {lead.location}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
          </div>
          <div className="flex gap-2 mt-4">
            <span className={`badge ${statusColor[lead.status]}`}>{lead.status}</span>
            <span className="badge bg-blue-800 text-blue-200">Score: {lead.score}/100</span>
            {lead.lastResearched && (
              <span className="badge bg-green-800 text-green-200">
                Researched {new Date(lead.lastResearched).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Research Button */}
          {lead.website ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-800 text-sm">AI Business Research</p>
                  <p className="text-blue-600 text-xs mt-0.5">Scrape website, find all socials, analyze gaps</p>
                </div>
                <button onClick={runResearch} disabled={researching} className="btn-primary text-sm">
                  {researching ? "Researching..." : "Run AI Research"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              Add the website URL below, then click "Run AI Research" to auto-find all data.
            </div>
          )}

          {/* Scores */}
          {(lead.websiteScore !== undefined || lead.socialScore !== undefined) && (
            <div className="card space-y-3">
              <h3 className="font-semibold text-slate-800 text-sm">Online Presence Score</h3>
              <ScoreBar score={lead.websiteScore ?? undefined} label="Website" />
              <ScoreBar score={lead.socialScore ?? undefined} label="Social Media" />
            </div>
          )}

          {/* Google Maps / Rating */}
          {(lead.rating || lead.address || lead.mapUrl || lead.gmbRank) && (
            <div className="card border-yellow-100 bg-yellow-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 text-sm">📍 Google Maps Data</h3>
                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-200">✓ Real Google Maps Data</span>
              </div>
              <div className="space-y-2 text-sm">
                {lead.gmbRank && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold ${lead.gmbRank <= 3 ? "bg-green-100 text-green-800" : lead.gmbRank <= 7 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-700"}`}>
                    <span className="text-lg">🏆</span>
                    <div>
                      <span>Google Maps Rank: <strong>#{lead.gmbRank}</strong></span>
                      <p className="text-xs font-normal mt-0.5">
                        {lead.gmbRank <= 3 ? "Top 3 — already visible" : lead.gmbRank <= 7 ? "Page 1 — can improve to top 3" : "Low ranking — big GMB opportunity to pitch!"}
                      </p>
                    </div>
                  </div>
                )}
                {lead.address && <div className="text-slate-700">📌 {lead.address}</div>}
                {lead.rating && (
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">{"★".repeat(Math.round(lead.rating))}{"☆".repeat(5 - Math.round(lead.rating))}</span>
                    <span className="text-slate-700 font-medium">{lead.rating}/5</span>
                    {lead.reviewCount && <span className="text-slate-500">({lead.reviewCount} reviews)</span>}
                    {lead.reviewCount && lead.reviewCount < 30 && (
                      <span className="text-red-500 text-xs font-medium">Low reviews — opportunity!</span>
                    )}
                  </div>
                )}
                {lead.mapUrl && (
                  <a href={lead.mapUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs font-medium">
                    Verify on Google Maps → (click to confirm this is real)
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 text-sm">Contact Information</h3>
              <button onClick={() => setEditMode(!editMode)} className="text-blue-600 text-xs hover:text-blue-800">
                {editMode ? "Cancel" : "Edit"}
              </button>
            </div>

            {editMode ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "website", label: "Website", placeholder: "https://example.com" },
                  { key: "email", label: "Email", placeholder: "owner@business.com" },
                  { key: "phone", label: "Phone", placeholder: "+91 98765 43210" },
                  { key: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/91..." },
                  { key: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/..." },
                  { key: "facebook", label: "Facebook URL", placeholder: "https://facebook.com/..." },
                  { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/..." },
                  { key: "youtube", label: "YouTube URL", placeholder: "https://youtube.com/..." },
                  { key: "twitter", label: "Twitter/X URL", placeholder: "https://twitter.com/..." },
                  { key: "gmb", label: "Google Maps URL", placeholder: "https://maps.google.com/..." },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <input className="input text-xs" placeholder={placeholder}
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="label">Notes</label>
                  <textarea className="input text-xs" rows={2} value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="col-span-2 flex gap-2">
                  <button onClick={saveManual} className="btn-primary text-sm">Save</button>
                  <button onClick={() => setEditMode(false)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: "Website", value: lead.website, icon: "🌐", link: true },
                  { label: "Email", value: lead.email, icon: "📧", link: false },
                  { label: "Phone", value: lead.phone, icon: "📞", link: false },
                  { label: "WhatsApp", value: lead.whatsapp, icon: "💬", link: true },
                  { label: "Google Maps", value: lead.gmb, icon: "📍", link: true },
                ].map(({ label, value, icon, link }) => value ? (
                  <div key={label} className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-0">
                    <span>{icon}</span>
                    <span className="text-xs text-slate-500 w-20">{label}</span>
                    {link ? (
                      <a href={value} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline truncate flex-1">{value}</a>
                    ) : (
                      <span className="text-sm text-slate-800 flex-1">{value}</span>
                    )}
                    <button onClick={() => navigator.clipboard.writeText(value)} className="text-slate-400 hover:text-slate-600 text-xs">Copy</button>
                  </div>
                ) : null)}
              </div>
            )}
          </div>

          {/* Social Media */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Social Media Presence</h3>
            <div className="grid grid-cols-2 gap-2">
              <SocialLink url={lead.instagram} label="Instagram" icon="📸" />
              <SocialLink url={lead.facebook} label="Facebook" icon="👥" />
              <SocialLink url={lead.linkedin} label="LinkedIn" icon="💼" />
              <SocialLink url={lead.youtube} label="YouTube" icon="▶️" />
              <SocialLink url={lead.twitter} label="Twitter/X" icon="🐦" />
              <SocialLink url={lead.whatsapp} label="WhatsApp" icon="💬" />
            </div>
          </div>

          {/* Gaps Found */}
          {gaps.length > 0 && (
            <div className="card border-red-100">
              <h3 className="font-semibold text-slate-800 text-sm mb-3">🚨 Gaps Identified ({gaps.length})</h3>
              <div className="grid grid-cols-1 gap-1.5">
                {gaps.map((gap, i) => (
                  <div key={i} className="flex items-start gap-2 bg-red-50 rounded-lg px-3 py-2">
                    <span className="text-red-500 text-xs mt-0.5">✗</span>
                    <span className="text-sm text-red-700">{gap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weakness Analysis */}
          {lead.weaknesses && (
            <div className="card border-orange-100">
              <h3 className="font-semibold text-slate-800 text-sm mb-3">📊 Weakness Analysis</h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{lead.weaknesses}</p>
            </div>
          )}

          {/* Outreach Angle */}
          {lead.outreachAngle && (
            <div className="card border-green-100 bg-green-50">
              <h3 className="font-semibold text-green-800 text-sm mb-2">🎯 Recommended Outreach Angle</h3>
              <p className="text-sm text-green-800 leading-relaxed">{lead.outreachAngle}</p>
              <button
                onClick={() => navigator.clipboard.writeText(lead.outreachAngle ?? "")}
                className="text-green-600 text-xs mt-2 hover:text-green-800">
                Copy angle →
              </button>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div className="card">
              <h3 className="font-semibold text-slate-800 text-sm mb-2">Notes</h3>
              <p className="text-sm text-slate-600">{lead.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [niche, setNiche] = useState("restaurant");
  const [location, setLocation] = useState("Mumbai");
  const [count, setCount] = useState(10);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [researchingId, setResearchingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    businessName: "", website: "", email: "", industry: "",
    location: "", phone: "", notes: "",
  });

  const fetchLeads = async () => {
    const url = filterStatus !== "all" ? `/api/leads?status=${filterStatus}&limit=100` : "/api/leads?limit=100";
    const res = await fetch(url);
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [filterStatus]);

  const generateLeads = async () => {
    setGenerating(true);
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate", niche, location, count }),
    });
    await fetchLeads();
    setGenerating(false);
  };

  const addLead = async () => {
    if (!form.businessName) return;
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ businessName: "", website: "", email: "", industry: "", location: "", phone: "", notes: "" });
    setShowAdd(false);
    await fetchLeads();
  };

  const quickResearch = async (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    if (!lead.website) return alert("Add website URL first by clicking the lead");
    setResearchingId(lead.id);
    await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id }),
    });
    await fetchLeads();
    setResearchingId(null);
  };

  const updateStatus = async (e: React.MouseEvent, id: string, status: string) => {
    e.stopPropagation();
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await fetchLeads();
  };

  const deleteLead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this lead?")) return;
    await fetch(`/api/leads?id=${id}`, { method: "DELETE" });
    await fetchLeads();
  };

  const refreshSelected = async () => {
    await fetchLeads();
    if (selectedLead) {
      const res = await fetch(`/api/leads?limit=100`);
      const data = await res.json();
      const updated = (data.leads as Lead[]).find((l) => l.id === selectedLead.id);
      if (updated) setSelectedLead(updated);
    }
  };

  return (
    <div className="p-8">
      {selectedLead && (
        <LeadProfile
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={refreshSelected}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Lead Finder</h2>
          <p className="text-slate-500 mt-1">Click any lead to see full profile, social media & weakness analysis</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(!showImport)} className="btn-secondary">⬆ Import CSV</button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">+ Add Lead</button>
        </div>
      </div>

      {/* AI Generator */}
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-800">Real Business Finder</h3>
            <p className="text-xs text-slate-400 mt-0.5">Pulls actual businesses from Google Maps via Apify — real phone, website, rating, address</p>
          </div>
          <span className="badge bg-green-100 text-green-700">Live Google Maps Data</span>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label">Target Niche</label>
            <input className="input" value={niche} onChange={(e) => setNiche(e.target.value)}
              placeholder="restaurant, gym, clinic..." />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="Mumbai, Delhi, Bangalore..." />
          </div>
          <div>
            <label className="label">Count</label>
            <select className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[5, 10, 20, 30].map((n) => <option key={n} value={n}>{n} leads</option>)}
            </select>
          </div>
        </div>
        <button onClick={generateLeads} disabled={generating} className="btn-primary">
          {generating ? "Fetching from Google Maps... (30-90 sec)" : "Find Real Businesses"}
        </button>
      </div>

      {/* CSV Import */}
      {showImport && (
        <div className="card mb-6 border-green-200">
          <h3 className="font-semibold text-slate-800 mb-2">Import Leads from CSV</h3>
          <p className="text-xs text-slate-400 mb-3">CSV columns: businessName, website, email, phone, industry, location, address, notes (header row required)</p>
          <input type="file" accept=".csv" className="input mb-3" onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            setImporting(true);
            const text = await file.text();
            const lines = text.trim().split("\n");
            const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
            const rows = lines.slice(1).map(line => {
              const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
              return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
            });
            await Promise.all(rows.filter(r => r.businessName).map(row =>
              fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row) })
            ));
            await fetchLeads();
            setShowImport(false);
            setImporting(false);
            alert(`Imported ${rows.length} leads!`);
          }} />
          {importing && <p className="text-sm text-blue-600">Importing and scoring leads...</p>}
          <button onClick={() => setShowImport(false)} className="btn-secondary text-sm">Cancel</button>
        </div>
      )}

      {/* Manual Add */}
      {showAdd && (
        <div className="card mb-6 border-blue-200">
          <h3 className="font-semibold text-slate-800 mb-4">Add Lead Manually</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { key: "businessName", label: "Business Name *", placeholder: "Sharma Restaurant" },
              { key: "website", label: "Website URL", placeholder: "https://sharmarestaurant.com" },
              { key: "email", label: "Email", placeholder: "owner@business.com" },
              { key: "industry", label: "Industry", placeholder: "Restaurant" },
              { key: "location", label: "Location", placeholder: "Mumbai" },
              { key: "phone", label: "Phone", placeholder: "+91 98765 43210" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input className="input" placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="mb-4">
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <button onClick={addLead} className="btn-primary">Save Lead</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", "new", "contacted", "replied", "converted", "dead"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filterStatus === s ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-slate-400 text-sm">Loading...</div>
      ) : leads.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-slate-500">No leads yet. Generate some with AI above.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Business", "Industry / Location", "Contact", "Socials", "Score", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-slate-600 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => {
                const gaps = lead.gaps ? (JSON.parse(lead.gaps) as string[]).length : 0;
                const socials = [lead.instagram, lead.facebook, lead.linkedin, lead.youtube].filter(Boolean).length;
                return (
                  <tr key={lead.id} className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelectedLead(lead)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{lead.businessName}</div>
                      {lead.website ? (
                        <div className="text-xs text-blue-500 truncate max-w-32">{lead.website}</div>
                      ) : (
                        <div className="text-xs text-slate-400">No website</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      <div>{lead.industry ?? "—"}</div>
                      <div className="text-slate-400">{lead.location ?? "—"}</div>
                      {lead.rating && (
                        <div className="text-yellow-500 text-xs">★ {lead.rating} ({lead.reviewCount ?? 0})</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className={lead.email ? "text-green-600" : "text-slate-300"}>{lead.email ? "✓ Email" : "✗ Email"}</div>
                      <div className={lead.phone ? "text-green-600" : "text-slate-300"}>{lead.phone ? "✓ Phone" : "✗ Phone"}</div>
                    </td>
                    <td className="px-4 py-3">
                      {lead.lastResearched ? (
                        <div className="flex gap-1 flex-wrap">
                          {[
                            { key: "instagram", icon: "📸" },
                            { key: "facebook", icon: "👥" },
                            { key: "linkedin", icon: "💼" },
                            { key: "youtube", icon: "▶️" },
                          ].map(({ key, icon }) => (
                            <span key={key} className={`text-sm ${lead[key as keyof Lead] ? "opacity-100" : "opacity-20"}`}
                              title={key}>
                              {icon}
                            </span>
                          ))}
                          {gaps > 0 && (
                            <span className="ml-1 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
                              {gaps} gaps
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Not researched</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${lead.score}%` }} />
                        </div>
                        <span className="text-xs text-slate-600">{lead.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className={`badge cursor-pointer text-xs ${statusColor[lead.status] ?? ""}`}
                        value={lead.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateStatus(e as unknown as React.MouseEvent, lead.id, e.target.value)}
                      >
                        {["new", "contacted", "replied", "converted", "dead"].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => quickResearch(e, lead)}
                          disabled={researchingId === lead.id}
                          className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                            lead.website
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          }`}
                          title={lead.website ? "Run AI research" : "Add website URL first"}>
                          {researchingId === lead.id ? "..." : "Research"}
                        </button>
                        <button onClick={(e) => deleteLead(e, lead.id)}
                          className="text-red-400 hover:text-red-600 text-xs">
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
