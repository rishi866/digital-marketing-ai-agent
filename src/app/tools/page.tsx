"use client";
import { useEffect, useState } from "react";

interface Lead { id: string; businessName: string; industry?: string; location?: string; gaps?: string; phone?: string; whatsapp?: string; }

const tempColor: Record<string, string> = {
  hot: "bg-red-100 text-red-700",
  warm: "bg-orange-100 text-orange-700",
  cold: "bg-blue-100 text-blue-700",
  dead: "bg-slate-100 text-slate-500",
};

export default function ToolsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tab, setTab] = useState<"pitch" | "objection" | "reply" | "callscript" | "whatsapp" | "competitor" | "casestudies">("pitch");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);

  // forms
  const [selectedGap, setSelectedGap] = useState("");
  const [pitchChannel, setPitchChannel] = useState<"email" | "whatsapp" | "linkedin">("email");
  const [objectionText, setObjectionText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [competitorName, setCompetitorName] = useState("");
  const [competitorStrengths, setCompetitorStrengths] = useState("");

  // case studies
  const [caseStudies, setCaseStudies] = useState<{ id: string; clientType: string; service: string; result: string; duration?: string }[]>([]);
  const [csForm, setCsForm] = useState({ clientType: "", service: "", result: "", duration: "" });

  useEffect(() => {
    fetch("/api/leads?limit=100").then(r => r.json()).then(d => setLeads(d.leads ?? []));
    fetch("/api/case-studies").then(r => r.json()).then(setCaseStudies);
  }, []);

  const gaps = selectedLead?.gaps ? JSON.parse(selectedLead.gaps) as string[] : [];

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    setLoading(true); setResult(null);
    const res = await fetch("/api/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, businessName: selectedLead?.businessName, industry: selectedLead?.industry, location: selectedLead?.location, ...extra }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  const generatePitch = async () => {
    if (!selectedLead || !selectedGap) return;
    setLoading(true); setResult(null);
    const res = await fetch("/api/pitch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: selectedLead.id, selectedGap, channel: pitchChannel }),
    });
    setResult(await res.json());
    setLoading(false);
  };

  const addCaseStudy = async () => {
    if (!csForm.clientType || !csForm.result) return;
    const res = await fetch("/api/case-studies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(csForm) });
    const data = await res.json();
    setCaseStudies(prev => [data, ...prev]);
    setCsForm({ clientType: "", service: "", result: "", duration: "" });
  };

  const deleteCaseStudy = async (id: string) => {
    await fetch(`/api/case-studies?id=${id}`, { method: "DELETE" });
    setCaseStudies(prev => prev.filter(c => c.id !== id));
  };

  const tabs = [
    { key: "pitch", label: "Weakness Pitch", icon: "🎯" },
    { key: "objection", label: "Objection Handler", icon: "🛡️" },
    { key: "reply", label: "Reply Analyzer", icon: "🔍" },
    { key: "callscript", label: "Call Script", icon: "📞" },
    { key: "whatsapp", label: "WhatsApp Pitch", icon: "💬" },
    { key: "competitor", label: "Competitor Pitch", icon: "⚔️" },
    { key: "casestudies", label: "Case Studies", icon: "🏆" },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">AI Tools Hub</h2>
        <p className="text-slate-500 mt-1">All your sales intelligence tools in one place</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key as typeof tab); setResult(null); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {tab !== "casestudies" && (
        <div className="grid grid-cols-4 gap-6">
          {/* Lead selector */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Select Lead</h3>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {leads.map(lead => (
                <button key={lead.id} onClick={() => { setSelectedLead(lead); setResult(null); setSelectedGap(""); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${selectedLead?.id === lead.id ? "bg-blue-600 text-white" : "hover:bg-slate-100 text-slate-700"}`}>
                  <div className="font-medium">{lead.businessName}</div>
                  <div className={selectedLead?.id === lead.id ? "text-blue-200" : "text-slate-400"}>{lead.industry ?? "Unknown"}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tool panel */}
          <div className="col-span-3 space-y-4">
            {/* WEAKNESS PITCH */}
            {tab === "pitch" && (
              <div className="card">
                <h3 className="font-semibold text-slate-800 mb-4">🎯 Pitch on Specific Weakness</h3>
                {!selectedLead ? <p className="text-slate-400 text-sm">Select a lead first</p> :
                  gaps.length === 0 ? <p className="text-amber-600 text-sm">Run AI Research on this lead first to find gaps</p> : (
                    <div className="space-y-4">
                      <div>
                        <label className="label">Select the weakness to pitch on</label>
                        <div className="grid grid-cols-2 gap-2">
                          {gaps.map((gap, i) => (
                            <button key={i} onClick={() => setSelectedGap(gap)}
                              className={`text-left px-3 py-2.5 rounded-lg text-sm border transition-colors ${selectedGap === gap ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 hover:border-slate-300 text-slate-700"}`}>
                              <span className="text-red-500 mr-1.5">✗</span>{gap}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="label">Channel</label>
                        <div className="flex gap-2">
                          {(["email", "whatsapp", "linkedin"] as const).map(c => (
                            <button key={c} onClick={() => setPitchChannel(c)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${pitchChannel === c ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                              {c === "email" ? "📧 Email" : c === "whatsapp" ? "💬 WhatsApp" : "💼 LinkedIn"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button onClick={generatePitch} disabled={loading || !selectedGap} className="btn-primary">
                        {loading ? "Writing pitch..." : "Generate Pitch"}
                      </button>
                    </div>
                  )}
              </div>
            )}

            {/* OBJECTION HANDLER */}
            {tab === "objection" && (
              <div className="card">
                <h3 className="font-semibold text-slate-800 mb-4">🛡️ Objection Handler</h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">Their reply / objection</label>
                    <textarea className="input" rows={4} placeholder={`Paste what they said...\n\n"We already have a marketing team"\n"Not the right time"\n"Too expensive"`}
                      value={objectionText} onChange={e => setObjectionText(e.target.value)} />
                  </div>
                  <button onClick={() => call("objection", { prospectReply: objectionText })} disabled={loading || !objectionText || !selectedLead} className="btn-primary">
                    {loading ? "Crafting response..." : "Overcome Objection"}
                  </button>
                  {!selectedLead && <p className="text-xs text-slate-400">Select a lead first</p>}
                </div>
              </div>
            )}

            {/* REPLY ANALYZER */}
            {tab === "reply" && (
              <div className="card">
                <h3 className="font-semibold text-slate-800 mb-4">🔍 Reply Analyzer</h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">Paste their reply</label>
                    <textarea className="input" rows={5} placeholder="Paste the prospect's reply here..."
                      value={replyText} onChange={e => setReplyText(e.target.value)} />
                  </div>
                  <button onClick={() => call("analyze_reply", { prospectReply: replyText })} disabled={loading || !replyText || !selectedLead} className="btn-primary">
                    {loading ? "Analyzing..." : "Analyze Reply"}
                  </button>
                </div>
              </div>
            )}

            {/* CALL SCRIPT */}
            {tab === "callscript" && (
              <div className="card">
                <h3 className="font-semibold text-slate-800 mb-4">📞 Cold Call Script</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="label">Owner Name (optional)</label>
                    <input className="input" placeholder="Rahul Sharma" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Top Gap to Lead With</label>
                    <select className="input" value={selectedGap} onChange={e => setSelectedGap(e.target.value)}>
                      <option value="">Auto-detect from research</option>
                      {gaps.map((g, i) => <option key={i} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={() => call("call_script", { ownerName, topGap: selectedGap || gaps[0] })} disabled={loading || !selectedLead} className="btn-primary">
                  {loading ? "Writing script..." : "Generate Call Script"}
                </button>
                {!selectedLead && <p className="text-xs text-slate-400 mt-2">Select a lead first</p>}
              </div>
            )}

            {/* WHATSAPP */}
            {tab === "whatsapp" && (
              <div className="card">
                <h3 className="font-semibold text-slate-800 mb-4">💬 WhatsApp Pitch</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="label">Owner Name (optional)</label>
                    <input className="input" placeholder="Rahul" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Weakness to Focus On</label>
                    <select className="input" value={selectedGap} onChange={e => setSelectedGap(e.target.value)}>
                      <option value="">Best gap from research</option>
                      {gaps.map((g, i) => <option key={i} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={() => call("whatsapp", { ownerName, topGap: selectedGap || gaps[0] })} disabled={loading || !selectedLead} className="btn-primary">
                  {loading ? "Writing message..." : "Generate WhatsApp Message"}
                </button>
                {selectedLead?.whatsapp && (
                  <p className="text-xs text-green-600 mt-2">WhatsApp number found: {selectedLead.whatsapp}</p>
                )}
              </div>
            )}

            {/* COMPETITOR */}
            {tab === "competitor" && (
              <div className="card">
                <h3 className="font-semibold text-slate-800 mb-4">⚔️ Competitor Comparison Pitch</h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">Competitor Business Name *</label>
                    <input className="input" placeholder="Rival Restaurant, Star Gym..." value={competitorName} onChange={e => setCompetitorName(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">What the competitor has that this prospect doesn't</label>
                    <textarea className="input" rows={3} placeholder={"Instagram with 5k followers\n200 Google reviews\nProfessional website"}
                      value={competitorStrengths} onChange={e => setCompetitorStrengths(e.target.value)} />
                  </div>
                  <button onClick={() => call("competitor_pitch", {
                    competitorName, prospectGaps: gaps,
                    competitorStrengths: competitorStrengths.split("\n").filter(Boolean)
                  })} disabled={loading || !selectedLead || !competitorName} className="btn-primary">
                    {loading ? "Writing pitch..." : "Generate Competitor Pitch"}
                  </button>
                </div>
              </div>
            )}

            {/* RESULT PANEL */}
            {(loading || result) && (
              <div className="card">
                {loading ? (
                  <div className="text-center py-8 text-slate-400">
                    <div className="text-3xl mb-2">✨</div>
                    <p>AI is working...</p>
                  </div>
                ) : result && (
                  <div>
                    {/* Reply Analyzer special UI */}
                    {tab === "reply" && result.temperature && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className={`badge text-sm px-3 py-1 ${tempColor[result.temperature] ?? "bg-slate-100"}`}>
                            {result.temperature?.toUpperCase()}
                          </span>
                          <span className="text-sm text-slate-600">{result.temperatureReason}</span>
                        </div>
                        {result.intentSignals && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Intent Signals</p>
                            {(JSON.parse(result.intentSignals as unknown as string) as string[] ?? [result.intentSignals]).map((s: string, i: number) => (
                              <div key={i} className="text-sm text-green-700 bg-green-50 rounded px-2 py-1 mb-1">✓ {s}</div>
                            ))}
                          </div>
                        )}
                        {result.nextAction && (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-blue-700 mb-1">NEXT ACTION</p>
                            <p className="text-sm text-blue-800">{result.nextAction}</p>
                          </div>
                        )}
                        {result.suggestedReply && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <p className="text-xs font-semibold text-slate-500 uppercase">Suggested Reply</p>
                              <button onClick={() => navigator.clipboard.writeText(result.suggestedReply ?? "")} className="text-blue-500 text-xs">Copy</button>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">{result.suggestedReply}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Objection handler */}
                    {tab === "objection" && result.reply && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="badge bg-orange-100 text-orange-700">{result.objectionType}</span>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap">{result.reply}</div>
                        <button onClick={() => navigator.clipboard.writeText(result.reply ?? "")} className="btn-secondary text-xs">Copy Reply</button>
                      </div>
                    )}

                    {/* Email pitch */}
                    {(tab === "pitch" || tab === "competitor") && (result.subject || result.body) && (
                      <div className="space-y-3">
                        {result.subject && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Subject</p>
                            <div className="bg-slate-50 rounded px-3 py-2 text-sm font-medium text-slate-800">{result.subject}</div>
                          </div>
                        )}
                        <div>
                          <div className="flex justify-between mb-1">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Body</p>
                            <button onClick={() => navigator.clipboard.writeText(`Subject: ${result.subject}\n\n${result.body}`)} className="text-blue-500 text-xs">Copy All</button>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result.body}</div>
                        </div>
                      </div>
                    )}

                    {/* WhatsApp / call script / generic message */}
                    {(tab === "whatsapp" || tab === "callscript") && (result.message || result.script) && (
                      <div>
                        <div className="flex justify-between mb-2">
                          <p className="text-xs font-semibold text-slate-500 uppercase">{tab === "whatsapp" ? "WhatsApp Message" : "Call Script"}</p>
                          <button onClick={() => navigator.clipboard.writeText((result.message ?? result.script) ?? "")} className="text-blue-500 text-xs">Copy</button>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {result.message ?? result.script}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CASE STUDIES */}
      {tab === "casestudies" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4">Add Case Study</h3>
            <p className="text-xs text-slate-400 mb-4">These are used automatically in pitches and proposals to build credibility.</p>
            <div className="space-y-3">
              {[
                { key: "clientType", label: "Client Type *", placeholder: "Restaurant in Mumbai" },
                { key: "service", label: "Service Provided", placeholder: "Instagram Management" },
                { key: "result", label: "Result Achieved *", placeholder: "800 followers in 60 days" },
                { key: "duration", label: "Duration", placeholder: "3 months" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input className="input" placeholder={placeholder}
                    value={csForm[key as keyof typeof csForm]}
                    onChange={e => setCsForm({ ...csForm, [key]: e.target.value })} />
                </div>
              ))}
              <button onClick={addCaseStudy} className="btn-primary w-full">Add Case Study</button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800">Saved Case Studies ({caseStudies.length})</h3>
            {caseStudies.length === 0 ? (
              <div className="card text-center py-8 text-slate-400">
                <p>No case studies yet. Add your past client results.</p>
                <p className="text-xs mt-1">Claude will use these in pitches and proposals.</p>
              </div>
            ) : caseStudies.map(cs => (
              <div key={cs.id} className="card py-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{cs.clientType}</p>
                    <p className="text-xs text-blue-600 mt-0.5">{cs.service}</p>
                    <p className="text-sm text-green-700 mt-1 font-medium">→ {cs.result}</p>
                    {cs.duration && <p className="text-xs text-slate-400 mt-0.5">in {cs.duration}</p>}
                  </div>
                  <button onClick={() => deleteCaseStudy(cs.id)} className="text-red-400 hover:text-red-600 text-xs self-start">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
