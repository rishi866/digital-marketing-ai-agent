"use client";
import { useEffect, useState, useRef } from "react";
const SERVICE_PACKAGES: Record<string, { basic: number; standard: number; premium: number }> = {
  "Social Media Management": { basic: 8000, standard: 15000, premium: 25000 },
  "Website Design & SEO": { basic: 15000, standard: 30000, premium: 60000 },
  "Google & Meta Ads": { basic: 10000, standard: 20000, premium: 40000 },
  "Reputation Management": { basic: 5000, standard: 10000, premium: 18000 },
  "Local SEO & GMB": { basic: 6000, standard: 12000, premium: 20000 },
  "Content Creation": { basic: 5000, standard: 10000, premium: 18000 },
  "Email Marketing": { basic: 4000, standard: 8000, premium: 15000 },
  "Video Marketing": { basic: 12000, standard: 25000, premium: 50000 },
  "WhatsApp Marketing": { basic: 3000, standard: 6000, premium: 10000 },
};

interface Lead { id: string; businessName: string; industry?: string; location?: string; gaps?: string; }
interface Proposal { id: string; title: string; body: string; services: string; pricingTier: string; status: string; createdAt: string; lead: { businessName: string; industry?: string }; }

const SERVICES = Object.keys(SERVICE_PACKAGES);
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

export default function ProposalsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [tier, setTier] = useState<"basic" | "standard" | "premium">("standard");
  const [generating, setGenerating] = useState(false);
  const [activeProposal, setActiveProposal] = useState<Proposal | null>(null);
  const [tab, setTab] = useState<"create" | "saved">("create");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/leads?limit=100").then(r => r.json()).then(d => setLeads(d.leads ?? []));
    fetch("/api/proposals").then(r => r.json()).then(setProposals);
  }, []);

  const gaps = selectedLead?.gaps ? JSON.parse(selectedLead.gaps) as string[] : [];

  // Auto-suggest services from gaps
  const suggestServices = () => {
    const gapServiceMap: Record<string, string> = {
      "instagram": "Social Media Management",
      "facebook": "Social Media Management",
      "website": "Website Design & SEO",
      "google": "Local SEO & GMB",
      "reviews": "Reputation Management",
      "ads": "Google & Meta Ads",
      "youtube": "Video Marketing",
      "whatsapp": "WhatsApp Marketing",
      "email": "Email Marketing",
      "linkedin": "Social Media Management",
    };
    const suggested = new Set<string>();
    gaps.forEach(gap => {
      for (const [key, svc] of Object.entries(gapServiceMap)) {
        if (gap.toLowerCase().includes(key)) suggested.add(svc);
      }
    });
    setSelectedServices(suggested.size > 0 ? suggested : new Set(["Social Media Management", "Local SEO & GMB"]));
  };

  const totalPrice = [...selectedServices].reduce((sum, s) => {
    const pkg = SERVICE_PACKAGES[s as keyof typeof SERVICE_PACKAGES];
    return sum + (pkg ? pkg[tier] : 0);
  }, 0);

  const generate = async () => {
    if (!selectedLead || selectedServices.size === 0) return;
    setGenerating(true);
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: selectedLead.id, services: [...selectedServices], tier }),
    });
    const data = await res.json();
    setActiveProposal({ ...data, lead: { businessName: selectedLead.businessName, industry: selectedLead.industry } });
    const updated = await fetch("/api/proposals").then(r => r.json());
    setProposals(updated);
    setGenerating(false);
    setTab("saved");
  };

  const printProposal = () => {
    const content = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${activeProposal?.title}</title>
      <style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a2e; }
        h1 { color: #0369a1; border-bottom: 2px solid #0369a1; padding-bottom: 10px; }
        h2 { color: #0369a1; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #f0f9ff; }
        @media print { body { margin: 20px; } }
      </style></head>
      <body>${content}</body></html>`);
    win.document.close();
    win.print();
  };

  function renderMarkdown(text: string) {
    return text
      .replace(/^# (.+)/gm, "<h1>$1</h1>")
      .replace(/^## (.+)/gm, "<h2>$1</h2>")
      .replace(/^### (.+)/gm, "<h3>$1</h3>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^\| (.+)/gm, (line) => {
        const cells = line.split("|").filter(Boolean).map(c => `<td>${c.trim()}</td>`).join("");
        return `<tr>${cells}</tr>`;
      })
      .replace(/^- (.+)/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
      .replace(/\n\n/g, "<br><br>")
      .replace(/\n/g, "<br>");
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Proposals</h2>
        <p className="text-slate-500 mt-1">Generate professional proposals based on lead weaknesses — download as PDF</p>
      </div>

      <div className="flex gap-2 mb-6">
        {[{ key: "create", label: "Create Proposal" }, { key: "saved", label: `Saved (${proposals.length})` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "create" && (
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-slate-800 text-sm mb-3">Select Lead</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {leads.map(lead => (
                  <button key={lead.id} onClick={() => { setSelectedLead(lead); setSelectedServices(new Set()); setActiveProposal(null); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${selectedLead?.id === lead.id ? "bg-blue-600 text-white" : "hover:bg-slate-100 text-slate-700"}`}>
                    <div className="font-medium">{lead.businessName}</div>
                    <div className={selectedLead?.id === lead.id ? "text-blue-200" : "text-slate-400"}>{lead.industry}</div>
                  </button>
                ))}
              </div>
              {selectedLead && gaps.length > 0 && (
                <button onClick={suggestServices} className="btn-secondary w-full text-xs mt-3">Auto-suggest Services from Gaps</button>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold text-slate-800 text-sm mb-3">Select Services</h3>
              <div className="space-y-1.5">
                {SERVICES.map(svc => {
                  const pkg = SERVICE_PACKAGES[svc as keyof typeof SERVICE_PACKAGES];
                  return (
                    <div key={svc} onClick={() => {
                      const s = new Set(selectedServices);
                      s.has(svc) ? s.delete(svc) : s.add(svc);
                      setSelectedServices(s);
                    }} className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${selectedServices.has(svc) ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50 border border-transparent"}`}>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" readOnly checked={selectedServices.has(svc)} className="rounded" />
                        <span className="font-medium text-slate-700">{svc}</span>
                      </div>
                      <span className="text-slate-400">₹{pkg[tier].toLocaleString("en-IN")}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-slate-800 text-sm mb-3">Pricing Tier</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(["basic", "standard", "premium"] as const).map(t => (
                  <button key={t} onClick={() => setTier(t)}
                    className={`py-2 rounded-lg text-xs font-medium capitalize transition-colors ${tier === t ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {t}
                  </button>
                ))}
              </div>
              {selectedServices.size > 0 && (
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-600">Total Monthly Investment</p>
                  <p className="text-xl font-bold text-green-700">₹{totalPrice.toLocaleString("en-IN")}</p>
                </div>
              )}
              <button onClick={generate} disabled={generating || !selectedLead || selectedServices.size === 0} className="btn-primary w-full mt-3">
                {generating ? "Writing proposal..." : "Generate Proposal"}
              </button>
            </div>
          </div>

          <div className="col-span-2">
            {!activeProposal ? (
              <div className="card h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <div className="text-4xl mb-3">📄</div>
                  <p>Select a lead and services, then generate</p>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-800">{activeProposal.title}</h3>
                  <button onClick={printProposal} className="btn-primary text-sm">Download PDF</button>
                </div>
                <div ref={printRef} className="prose prose-sm max-w-none text-slate-700 max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(activeProposal.body) }} />
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "saved" && (
        <div className="space-y-4">
          {proposals.length === 0 ? (
            <div className="card text-center py-12 text-slate-400">No proposals yet.</div>
          ) : proposals.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{p.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{p.lead.industry} · {new Date(p.createdAt).toLocaleDateString()} · {p.pricingTier}</p>
                  <div className="flex gap-1 mt-2">
                    {(JSON.parse(p.services) as string[]).map((s, i) => (
                      <span key={i} className="badge bg-blue-50 text-blue-700 text-xs">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select value={p.status} onChange={async e => {
                    await fetch("/api/proposals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, status: e.target.value }) });
                    setProposals(prev => prev.map(x => x.id === p.id ? { ...x, status: e.target.value } : x));
                  }} className={`badge cursor-pointer ${STATUS_COLOR[p.status]}`}>
                    {["draft", "sent", "accepted", "rejected"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => setActiveProposal(p)} className="btn-secondary text-xs">View</button>
                </div>
              </div>
              {activeProposal?.id === p.id && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="flex justify-end mb-2">
                    <button onClick={printProposal} className="btn-primary text-xs">Download PDF</button>
                  </div>
                  <div ref={printRef} className="prose prose-sm max-w-none text-slate-700 max-h-80 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
