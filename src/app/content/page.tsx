"use client";
import { useEffect, useState } from "react";

interface ContentItem {
  id: string;
  type: string;
  platform?: string;
  title?: string;
  body: string;
  industry?: string;
  createdAt: string;
}

const typeColors: Record<string, string> = {
  social_post: "bg-pink-100 text-pink-700",
  blog: "bg-purple-100 text-purple-700",
  ad_copy: "bg-orange-100 text-orange-700",
  email_template: "bg-blue-100 text-blue-700",
  proposal: "bg-green-100 text-green-700",
};

export default function ContentPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [tab, setTab] = useState<"social" | "blog" | "ads" | "proposal" | "calendar" | "saved">("social");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [resultObj, setResultObj] = useState<Record<string, string> | null>(null);

  const [socialForm, setSocialForm] = useState({ industry: "restaurant", platform: "instagram", topic: "", tone: "professional yet friendly" });
  const [blogForm, setBlogForm] = useState({ topic: "", industry: "restaurant", wordCount: 800 });
  const [adForm, setAdForm] = useState({ businessType: "restaurant", offer: "Free consultation", platform: "facebook", targetAudience: "local business owners" });
  const [proposalForm, setProposalForm] = useState({ clientName: "", businessType: "", painPoints: "", budget: "" });
  const [calForm, setCalForm] = useState({ industry: "restaurant", platform: "instagram", weeks: 4 });

  const fetchContent = () => {
    fetch("/api/content").then((r) => r.json()).then(setContent);
  };

  useEffect(() => { fetchContent(); }, []);

  const generate = async (type: string, payload: Record<string, unknown>) => {
    setLoading(true);
    setResult("");
    setResultObj(null);
    const res = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...payload }),
    });
    const data = await res.json();

    if (type === "ad_copy") {
      setResultObj(data);
    } else if (type === "calendar") {
      setResult(data.calendar ?? "");
    } else if (type === "proposal") {
      setResult(data.proposal ?? "");
    } else {
      setResult(data.body ?? "");
    }
    fetchContent();
    setLoading(false);
  };

  const deleteContent = async (id: string) => {
    await fetch(`/api/content?id=${id}`, { method: "DELETE" });
    fetchContent();
  };

  const platforms = ["instagram", "facebook", "linkedin", "twitter", "google"];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Content Creator</h2>
        <p className="text-slate-500 mt-1">AI-generated posts, blogs, ads, proposals, and calendars</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: "social", label: "Social Posts" },
          { key: "blog", label: "Blog Articles" },
          { key: "ads", label: "Ad Copy" },
          { key: "proposal", label: "Proposals" },
          { key: "calendar", label: "Content Calendar" },
          { key: "saved", label: `Saved (${content.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => { setTab(key as typeof tab); setResult(""); setResultObj(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Form panel */}
        {tab !== "saved" && (
          <div className="col-span-2 card">
            {tab === "social" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800">Social Media Post</h3>
                <div>
                  <label className="label">Platform</label>
                  <select className="input" value={socialForm.platform} onChange={(e) => setSocialForm({ ...socialForm, platform: e.target.value })}>
                    {platforms.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Industry</label>
                  <input className="input" value={socialForm.industry} onChange={(e) => setSocialForm({ ...socialForm, industry: e.target.value })} placeholder="restaurant, gym, clinic..." />
                </div>
                <div>
                  <label className="label">Topic (optional)</label>
                  <input className="input" value={socialForm.topic} onChange={(e) => setSocialForm({ ...socialForm, topic: e.target.value })} placeholder="e.g. 5 tips for growing on Instagram" />
                </div>
                <button onClick={() => generate("social_post", socialForm)} disabled={loading} className="btn-primary w-full">
                  {loading ? "Generating..." : "Generate Post"}
                </button>
              </div>
            )}

            {tab === "blog" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800">Blog Article</h3>
                <div>
                  <label className="label">Topic *</label>
                  <input className="input" value={blogForm.topic} onChange={(e) => setBlogForm({ ...blogForm, topic: e.target.value })} placeholder="e.g. Why restaurants need social media" />
                </div>
                <div>
                  <label className="label">Industry</label>
                  <input className="input" value={blogForm.industry} onChange={(e) => setBlogForm({ ...blogForm, industry: e.target.value })} />
                </div>
                <div>
                  <label className="label">Word Count</label>
                  <select className="input" value={blogForm.wordCount} onChange={(e) => setBlogForm({ ...blogForm, wordCount: Number(e.target.value) })}>
                    {[500, 800, 1200, 1500].map((n) => <option key={n} value={n}>{n} words</option>)}
                  </select>
                </div>
                <button onClick={() => generate("blog", blogForm)} disabled={loading || !blogForm.topic} className="btn-primary w-full">
                  {loading ? "Writing..." : "Write Article"}
                </button>
              </div>
            )}

            {tab === "ads" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800">Ad Copy</h3>
                <div>
                  <label className="label">Business Type</label>
                  <input className="input" value={adForm.businessType} onChange={(e) => setAdForm({ ...adForm, businessType: e.target.value })} />
                </div>
                <div>
                  <label className="label">Offer / Service</label>
                  <input className="input" value={adForm.offer} onChange={(e) => setAdForm({ ...adForm, offer: e.target.value })} placeholder="e.g. Free website audit" />
                </div>
                <div>
                  <label className="label">Platform</label>
                  <select className="input" value={adForm.platform} onChange={(e) => setAdForm({ ...adForm, platform: e.target.value })}>
                    {["facebook", "google", "instagram"].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <button onClick={() => generate("ad_copy", adForm)} disabled={loading} className="btn-primary w-full">
                  {loading ? "Writing..." : "Generate Ad Copy"}
                </button>
              </div>
            )}

            {tab === "proposal" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800">Client Proposal</h3>
                <div>
                  <label className="label">Client Name *</label>
                  <input className="input" value={proposalForm.clientName} onChange={(e) => setProposalForm({ ...proposalForm, clientName: e.target.value })} placeholder="ABC Restaurant" />
                </div>
                <div>
                  <label className="label">Business Type</label>
                  <input className="input" value={proposalForm.businessType} onChange={(e) => setProposalForm({ ...proposalForm, businessType: e.target.value })} placeholder="Restaurant" />
                </div>
                <div>
                  <label className="label">Pain Points</label>
                  <textarea className="input" rows={2} value={proposalForm.painPoints} onChange={(e) => setProposalForm({ ...proposalForm, painPoints: e.target.value })} placeholder="Low foot traffic, no social media presence..." />
                </div>
                <div>
                  <label className="label">Budget Range</label>
                  <input className="input" value={proposalForm.budget} onChange={(e) => setProposalForm({ ...proposalForm, budget: e.target.value })} placeholder="₹15,000-30,000/month" />
                </div>
                <button onClick={() => generate("proposal", proposalForm)} disabled={loading || !proposalForm.clientName} className="btn-primary w-full">
                  {loading ? "Writing..." : "Generate Proposal"}
                </button>
              </div>
            )}

            {tab === "calendar" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800">Content Calendar</h3>
                <div>
                  <label className="label">Industry</label>
                  <input className="input" value={calForm.industry} onChange={(e) => setCalForm({ ...calForm, industry: e.target.value })} />
                </div>
                <div>
                  <label className="label">Platform</label>
                  <select className="input" value={calForm.platform} onChange={(e) => setCalForm({ ...calForm, platform: e.target.value })}>
                    {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Duration</label>
                  <select className="input" value={calForm.weeks} onChange={(e) => setCalForm({ ...calForm, weeks: Number(e.target.value) })}>
                    {[2, 4, 8].map((n) => <option key={n} value={n}>{n} weeks</option>)}
                  </select>
                </div>
                <button onClick={() => generate("calendar", calForm)} disabled={loading} className="btn-primary w-full">
                  {loading ? "Planning..." : "Generate Calendar"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Result panel */}
        <div className={tab === "saved" ? "col-span-5" : "col-span-3"}>
          {tab === "saved" ? (
            <div className="space-y-3">
              {content.length === 0 ? (
                <div className="card text-center py-12 text-slate-400">No content generated yet.</div>
              ) : content.map((item) => (
                <div key={item.id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${typeColors[item.type] ?? "bg-slate-100"}`}>{item.type.replace("_", " ")}</span>
                      {item.platform && <span className="badge bg-slate-100 text-slate-600">{item.platform}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                      <button onClick={() => deleteContent(item.id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
                    </div>
                  </div>
                  {item.title && <p className="font-medium text-slate-800 mb-1">{item.title}</p>}
                  <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-4">{item.body}</p>
                  <button onClick={() => navigator.clipboard.writeText(item.body)} className="text-blue-500 text-xs mt-2 hover:text-blue-700">Copy</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="card h-full min-h-96">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div>
                    <div className="text-3xl mb-2 text-center">✍️</div>
                    <p>AI is writing your content...</p>
                  </div>
                </div>
              ) : resultObj ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800">Ad Copy</h3>
                  {Object.entries(resultObj).map(([key, val]) => (
                    <div key={key} className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-slate-500 uppercase mb-1">{key.replace(/([A-Z])/g, " $1")}</div>
                      <div className="text-sm text-slate-800">{val}</div>
                    </div>
                  ))}
                  <button onClick={() => navigator.clipboard.writeText(JSON.stringify(resultObj, null, 2))} className="btn-secondary">
                    Copy All
                  </button>
                </div>
              ) : result ? (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-slate-800">Generated Content</h3>
                    <button onClick={() => navigator.clipboard.writeText(result)} className="btn-secondary text-xs">
                      Copy
                    </button>
                  </div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {result}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <div className="text-4xl mb-3">✍️</div>
                    <p>Fill the form and click Generate</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
