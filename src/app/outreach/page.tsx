"use client";
import { useEffect, useState } from "react";

interface Lead {
  id: string;
  businessName: string;
  email?: string;
  industry?: string;
  location?: string;
  notes?: string;
}

interface OutreachLog {
  id: string;
  subject: string;
  body: string;
  sentAt: string;
  channel: string;
  lead: { businessName: string; status: string };
}

export default function OutreachPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [logs, setLogs] = useState<OutreachLog[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [linkedInDM, setLinkedInDM] = useState("");
  const [tab, setTab] = useState<"compose" | "history" | "linkedin">("compose");

  useEffect(() => {
    fetch("/api/leads?limit=100").then((r) => r.json()).then((d) => setLeads(d.leads ?? []));
    fetch("/api/outreach").then((r) => r.json()).then(setLogs);
  }, []);

  const generateEmail = async () => {
    if (!selectedLead) return;
    setLoading(true);
    const res = await fetch("/api/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate_email",
        businessName: selectedLead.businessName,
        industry: selectedLead.industry,
        location: selectedLead.location,
        notes: selectedLead.notes,
      }),
    });
    const data = await res.json();
    setDraft(data);
    setLoading(false);
  };

  const sendEmail = async () => {
    if (!selectedLead?.email || !draft) return alert("No email address for this lead.");
    setSending(true);
    await fetch("/api/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send_email",
        to: selectedLead.email,
        subject: draft.subject,
        body: draft.body,
        leadId: selectedLead.id,
      }),
    });
    const logsRes = await fetch("/api/outreach");
    setLogs(await logsRes.json());
    setSending(false);
    alert("Email sent successfully!");
  };

  const generateLinkedIn = async () => {
    if (!selectedLead) return;
    setLoading(true);
    const res = await fetch("/api/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "linkedin_dm",
        businessName: selectedLead.businessName,
        industry: selectedLead.industry,
        notes: selectedLead.notes,
      }),
    });
    const data = await res.json();
    setLinkedInDM(data.message ?? "");
    setLoading(false);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Cold Outreach</h2>
        <p className="text-slate-500 mt-1">AI-written personalized emails and LinkedIn DMs</p>
      </div>

      <div className="flex gap-2 mb-6">
        {(["compose", "linkedin", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}>
            {t === "compose" ? "Email Composer" : t === "linkedin" ? "LinkedIn DM" : "Sent History"}
          </button>
        ))}
      </div>

      {(tab === "compose" || tab === "linkedin") && (
        <div className="grid grid-cols-3 gap-6">
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-3">Select Lead</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {leads.map((lead) => (
                <button key={lead.id} onClick={() => { setSelectedLead(lead); setDraft(null); setLinkedInDM(""); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    selectedLead?.id === lead.id
                      ? "bg-blue-600 text-white"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}>
                  <div className="font-medium">{lead.businessName}</div>
                  <div className={`text-xs mt-0.5 ${selectedLead?.id === lead.id ? "text-blue-100" : "text-slate-400"}`}>
                    {lead.industry ?? "Unknown"} · {lead.email ?? "No email"}
                  </div>
                </button>
              ))}
              {leads.length === 0 && <p className="text-slate-400 text-sm">No leads. Add some in Lead Finder.</p>}
            </div>
          </div>

          <div className="col-span-2">
            {!selectedLead ? (
              <div className="card h-full flex items-center justify-center text-slate-400">
                Select a lead to generate outreach
              </div>
            ) : tab === "compose" ? (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800">Email for {selectedLead.businessName}</h3>
                  <button onClick={generateEmail} disabled={loading} className="btn-primary">
                    {loading ? "Writing..." : draft ? "Regenerate" : "Write with AI"}
                  </button>
                </div>

                {draft ? (
                  <div className="space-y-4">
                    <div>
                      <label className="label">Subject</label>
                      <input className="input" value={draft.subject}
                        onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Body</label>
                      <textarea className="input" rows={10} value={draft.body}
                        onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={sendEmail} disabled={sending} className="btn-primary">
                        {sending ? "Sending..." : "Send Email"}
                      </button>
                      <button onClick={() => navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`)}
                        className="btn-secondary">
                        Copy to Clipboard
                      </button>
                    </div>
                    {!selectedLead.email && (
                      <p className="text-amber-600 text-xs">This lead has no email. Copy and send manually.</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <div className="text-4xl mb-3">📧</div>
                    <p>Click "Write with AI" to generate a personalized email</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800">LinkedIn DM for {selectedLead.businessName}</h3>
                  <button onClick={generateLinkedIn} disabled={loading} className="btn-primary">
                    {loading ? "Writing..." : linkedInDM ? "Regenerate" : "Write with AI"}
                  </button>
                </div>
                {linkedInDM ? (
                  <div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700 mb-4 leading-relaxed">
                      {linkedInDM}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${linkedInDM.length > 300 ? "text-red-500" : "text-slate-400"}`}>
                        {linkedInDM.length}/300 chars
                      </span>
                      <button onClick={() => navigator.clipboard.writeText(linkedInDM)} className="btn-secondary">
                        Copy Message
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <div className="text-4xl mb-3">💼</div>
                    <p>Click "Write with AI" to generate a LinkedIn connection message</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="card p-0 overflow-hidden">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No emails sent yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Business", "Subject", "Channel", "Sent At"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{log.lead.businessName}</td>
                    <td className="px-4 py-3 text-slate-600">{log.subject}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-blue-100 text-blue-700 capitalize">{log.channel}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(log.sentAt).toLocaleString()}</td>
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
