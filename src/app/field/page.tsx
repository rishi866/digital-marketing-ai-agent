"use client";
import { useState, useRef } from "react";

interface ObjHandle { objection: string; response: string }

interface Brief {
  businessName: string;
  category: string;
  address: string;
  phone: string;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  mapUrl: string | null;
  hasWebsite: boolean;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  whatsapp: string | null;
  gmb: string | null;
  presenceScore: number;
  gaps: string[];
  talkingPoints: string[];
  openingLine: string;
  pitchServices: string[];
  objectionHandles: ObjHandle[];
  closingAsk: string;
  whyNow: string;
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  const label = score >= 70 ? "Good" : score >= 40 ? "Weak" : "Poor";
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${score} 100`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold" style={{ color }}>
          {score}
        </span>
      </div>
      <span className="text-xs font-semibold mt-1" style={{ color }}>{label}</span>
      <span className="text-xs text-slate-400">Presence</span>
    </div>
  );
}

function PresenceDot({ active, label, url }: { active: boolean; label: string; url?: string | null }) {
  return (
    <a href={url ?? undefined} target="_blank" rel="noreferrer"
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${active ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-600"} ${url ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}>
      <span>{active ? "✓" : "✗"}</span>{label}
    </a>
  );
}

export default function FieldPage() {
  const [shopName, setShopName] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const lookup = async () => {
    if (!shopName.trim()) return;
    setLoading(true);
    setError("");
    setBrief(null);
    try {
      const res = await fetch("/api/field-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: shopName, location: city || "India" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      setBrief(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1800);
  };

  const printBrief = () => {
    if (!brief) return;
    const content = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Meeting Brief — ${brief.businessName}</title>
    <style>
      body{font-family:system-ui,sans-serif;max-width:680px;margin:30px auto;padding:0 20px;color:#1e293b}
      h1{color:#1d4ed8;font-size:1.3rem;margin-bottom:4px}
      h2{font-size:0.85rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em;margin:20px 0 8px}
      .chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
      .chip{padding:3px 10px;border-radius:20px;font-size:0.8rem;font-weight:600}
      .gap-chip{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
      .svc-chip{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
      ol,ul{padding-left:18px;margin:6px 0}
      li{margin:5px 0;font-size:0.9rem;line-height:1.55}
      .highlight{background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin:8px 0;font-weight:600;font-size:0.9rem}
      .objection-block{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin:8px 0}
      .obj-q{font-weight:700;color:#64748b;font-size:0.82rem}
      .obj-a{color:#1e293b;margin-top:4px;font-size:0.9rem}
      @media print{body{margin:10px}}
    </style></head><body>${content}</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-6 py-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">⚡</span>
            <h1 className="text-xl font-bold">Field Sales Intel</h1>
          </div>
          <p className="text-blue-200 text-sm">Shop ka naam daalo → instant meeting brief</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-5 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Shop / Business Name</label>
              <input
                type="text"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !loading && lookup()}
                placeholder="e.g. Raj Electronics"
                className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">City / Location</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !loading && lookup()}
                placeholder="e.g. Varanasi, UP"
                className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
            </div>
            <button
              onClick={lookup}
              disabled={loading || !shopName.trim()}
              className="w-full py-3 rounded-xl font-bold text-white transition-all text-base"
              style={{ background: loading ? "#93c5fd" : "#1d4ed8" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Searching… (30-60 sec)
                </span>
              ) : "Get Meeting Brief →"}
            </button>
          </div>
          {error && <p className="text-red-600 text-sm mt-3 text-center">{error}</p>}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-pulse text-4xl">🔍</div>
              <div>
                <p className="font-semibold text-slate-800">Gathering intel on <span className="text-blue-600">{shopName}</span></p>
                <p className="text-sm text-slate-500 mt-1">Checking Google Maps → website → social media → generating brief</p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full animate-pulse w-2/3" />
              </div>
            </div>
          </div>
        )}

        {/* Brief */}
        {brief && !loading && (
          <div className="mt-6 space-y-4" ref={printRef}>

            {/* Business header */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-900 truncate">{brief.businessName}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{brief.category}</p>
                  {brief.address && <p className="text-xs text-slate-400 mt-1">📍 {brief.address}</p>}
                  {brief.phone && (
                    <a href={`tel:${brief.phone}`} className="text-xs text-blue-600 mt-1 block">📞 {brief.phone}</a>
                  )}
                  {brief.rating && (
                    <p className="text-xs text-amber-600 mt-1">⭐ {brief.rating}/5 ({brief.reviewCount?.toLocaleString()} reviews)</p>
                  )}
                  <div className="flex gap-2 flex-wrap mt-2">
                    {brief.mapUrl && (
                      <a href={brief.mapUrl} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline">🗺 Google Maps</a>
                    )}
                    {brief.website && (
                      <a href={brief.website} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline">🌐 Website</a>
                    )}
                  </div>
                </div>
                <ScoreRing score={brief.presenceScore} />
              </div>

              {/* Presence chips */}
              <div className="flex flex-wrap gap-2 mt-4">
                <PresenceDot active={brief.hasWebsite} label="Website" url={brief.website} />
                <PresenceDot active={!!brief.instagram} label="Instagram" url={brief.instagram} />
                <PresenceDot active={!!brief.facebook} label="Facebook" url={brief.facebook} />
                <PresenceDot active={!!brief.youtube} label="YouTube" url={brief.youtube} />
                <PresenceDot active={!!brief.whatsapp} label="WhatsApp" url={brief.whatsapp} />
                <PresenceDot active={!!brief.gmb} label="Google Maps" url={brief.gmb} />
              </div>

              <button onClick={printBrief}
                className="mt-4 w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                🖨️ Print / Save as PDF
              </button>
            </div>

            {/* Gaps */}
            {brief.gaps?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5">
                <h3 className="font-bold text-red-700 text-sm uppercase tracking-wide mb-3">❌ Gaps to Pitch On</h3>
                <div className="flex flex-wrap gap-2">
                  {brief.gaps.map((g, i) => (
                    <span key={i} className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-full text-sm font-medium">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Services to pitch */}
            {brief.pitchServices?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-5">
                <h3 className="font-bold text-blue-700 text-sm uppercase tracking-wide mb-3">🎯 Services to Pitch</h3>
                <div className="flex flex-wrap gap-2">
                  {brief.pitchServices.map((s, i) => (
                    <span key={i} className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-sm font-semibold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Opening line */}
            {brief.openingLine && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-amber-800 text-sm uppercase tracking-wide mb-2">🗣 Opening Line</h3>
                    <p className="text-amber-900 font-medium text-sm leading-relaxed">"{brief.openingLine}"</p>
                  </div>
                  <button onClick={() => copy(brief.openingLine, "open")}
                    className="shrink-0 px-3 py-1.5 bg-amber-200 text-amber-800 rounded-lg text-xs font-medium">
                    {copied === "open" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            {/* Talking points */}
            {brief.talkingPoints?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">📋 Talking Points</h3>
                  <button onClick={() => copy(brief.talkingPoints.join("\n\n"), "tp")}
                    className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                    {copied === "tp" ? "✓ Copied" : "Copy All"}
                  </button>
                </div>
                <ol className="space-y-3">
                  {brief.talkingPoints.map((pt, i) => (
                    <li key={i} className="flex gap-3 group">
                      <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-slate-700 text-sm leading-relaxed flex-1">
                        {pt.replace(/^\d+\.\s*/, "")}
                      </span>
                      <button onClick={() => copy(pt.replace(/^\d+\.\s*/, ""), `tp${i}`)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 px-2 text-slate-400 hover:text-slate-600 text-xs transition-opacity">
                        {copied === `tp${i}` ? "✓" : "copy"}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Why Now */}
            {brief.whyNow && (
              <div className="bg-green-50 rounded-2xl border border-green-200 p-5">
                <h3 className="font-bold text-green-800 text-sm uppercase tracking-wide mb-2">⏰ Why Act Now</h3>
                <p className="text-green-900 text-sm leading-relaxed">{brief.whyNow}</p>
              </div>
            )}

            {/* Objections */}
            {brief.objectionHandles?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-3">🛡 Objection Handlers</h3>
                <div className="space-y-3">
                  {brief.objectionHandles.map((o, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">They say:</p>
                      <p className="text-slate-700 font-semibold text-sm mt-0.5">"{o.objection}"</p>
                      <p className="text-xs font-bold text-blue-500 uppercase tracking-wide mt-2">You say:</p>
                      <p className="text-slate-800 text-sm mt-0.5 leading-relaxed">"{o.response}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Closing ask */}
            {brief.closingAsk && (
              <div className="bg-indigo-50 rounded-2xl border border-indigo-200 p-5">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-indigo-800 text-sm uppercase tracking-wide mb-2">🤝 Closing Ask</h3>
                    <p className="text-indigo-900 font-medium text-sm leading-relaxed">"{brief.closingAsk}"</p>
                  </div>
                  <button onClick={() => copy(brief.closingAsk, "close")}
                    className="shrink-0 px-3 py-1.5 bg-indigo-200 text-indigo-800 rounded-lg text-xs font-medium">
                    {copied === "close" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            {/* New search */}
            <button onClick={() => { setBrief(null); setShopName(""); setCity(""); }}
              className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-semibold text-sm hover:bg-slate-200 transition-colors">
              ← Search Another Shop
            </button>

          </div>
        )}
      </div>
    </div>
  );
}
