import { askClaude } from "../anthropic";
import { prisma } from "../db";

// ── Firecrawl website scraper ─────────────────────────────────────────────────

interface FirecrawlResult {
  markdown: string;
  links: string[];
  metadata: {
    title?: string;
    description?: string;
    statusCode?: number;
    error?: string;
  };
}

async function firecrawlScrape(url: string): Promise<FirecrawlResult | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;

  try {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http")) cleanUrl = "https://" + cleanUrl;

    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: cleanUrl,
        formats: ["markdown", "links"],
        onlyMainContent: false,
        timeout: 20000,
        waitFor: 2000,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as FirecrawlResult;
  } catch {
    return null;
  }
}

// Also scrape contact page for more data
async function firecrawlContact(baseUrl: string): Promise<FirecrawlResult | null> {
  const base = baseUrl.replace(/\/$/, "");
  // Try /contact first, then /contact-us
  let result = await firecrawlScrape(`${base}/contact`);
  if (!result?.markdown) result = await firecrawlScrape(`${base}/contact-us`);
  return result;
}

// ── Extract data from Firecrawl markdown ─────────────────────────────────────

function extractEmails(text: string): string[] {
  const found = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [];
  return [...new Set(
    found.filter((e) => !e.match(/\.(png|jpg|gif|css|js)$/i) && !e.includes("example") && !e.includes("sentry"))
  )].slice(0, 3);
}

function extractPhones(text: string): string[] {
  const patterns = [
    /(\+91[\s\-]?)?[6-9]\d{9}/g,
    /\+1[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}/g,
  ];
  const found: string[] = [];
  for (const p of patterns) {
    found.push(...(text.match(p) ?? []).map((m) => m.replace(/\s/g, "")));
  }
  return [...new Set(found)].slice(0, 3);
}

function extractSocialFromLinks(links: string[]) {
  const find = (domain: string) =>
    links.find((l) => l.includes(domain) && !l.includes("share") && !l.includes("intent")) ?? null;

  const whatsapp = links.find((l) => l.includes("wa.me/") || l.includes("whatsapp.com/")) ?? null;

  return {
    instagram: find("instagram.com/"),
    facebook: find("facebook.com/"),
    linkedin: find("linkedin.com/"),
    youtube: find("youtube.com/"),
    twitter: links.find((l) => l.includes("twitter.com/") || l.includes("x.com/")) ?? null,
    whatsapp,
    gmb: links.find((l) => l.includes("maps.google.com") || l.includes("goo.gl/maps") || l.includes("g.page")) ?? null,
  };
}

// ── Check if a social profile actually exists ─────────────────────────────────

async function checkUrl(url: string | null): Promise<boolean> {
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Claude gap analysis ───────────────────────────────────────────────────────

async function analyzeGaps(params: {
  businessName: string;
  industry?: string;
  location?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  website?: string;
  websiteTitle?: string;
  websiteDesc?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  twitter?: string;
  whatsapp?: string;
  gmb?: string;
}): Promise<{
  gaps: string[];
  weaknesses: string;
  outreachAngle: string;
  websiteScore: number;
  socialScore: number;
}> {
  const p = params;

  const prompt = `
You are a digital marketing analyst auditing a business for a full-service agency.

BUSINESS INFO:
- Name: ${p.businessName}
- Industry: ${p.industry ?? "unknown"}
- Location: ${p.location ?? "India"} ${p.address ? `(${p.address})` : ""}
- Google Rating: ${p.rating ? `${p.rating}/5 (${p.reviewCount ?? 0} reviews)` : "Not found"}

DIGITAL PRESENCE AUDIT:
- Website: ${p.website ? `YES — Title: "${p.websiteTitle ?? ""}", Desc: "${p.websiteDesc ?? ""}"` : "❌ NO WEBSITE"}
- Email: ${p.email ? `✅ ${p.email}` : "❌ Not found"}
- Phone: ${p.phone ? `✅ ${p.phone}` : "❌ Not found"}
- Instagram: ${p.instagram ? `✅ ${p.instagram}` : "❌ Missing"}
- Facebook: ${p.facebook ? `✅ ${p.facebook}` : "❌ Missing"}
- LinkedIn: ${p.linkedin ? `✅ ${p.linkedin}` : "❌ Missing"}
- YouTube: ${p.youtube ? `✅ ${p.youtube}` : "❌ Missing"}
- WhatsApp Business: ${p.whatsapp ? `✅ ${p.whatsapp}` : "❌ Missing"}
- Google Maps/GMB: ${p.gmb ? `✅ Listed` : "❌ Missing or unclaimed"}
- Twitter/X: ${p.twitter ? `✅` : "❌ Missing"}

Provide a sharp, specific analysis in JSON:
{
  "gaps": ["up to 8 specific gaps, each under 12 words, very specific to this business"],
  "weaknesses": "3 short paragraphs. Be specific: mention their exact missing platforms, low review count if applicable, competitor advantages. Write as if advising your sales team before a call.",
  "outreachAngle": "1 precise paragraph: what EXACT pain point to open with, what service to offer first, and what result to promise. Make it feel like you researched them.",
  "websiteScore": <integer 0-100, 0 if no website>,
  "socialScore": <integer 0-100 based on how many platforms are active>
}

Only respond with valid JSON.`;

  const result = await askClaude(prompt);
  try {
    const cleaned = result.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    const presentCount = [p.instagram, p.facebook, p.linkedin, p.youtube, p.twitter, p.whatsapp, p.gmb].filter(Boolean).length;
    return {
      gaps: ["Analysis failed — run again"],
      weaknesses: "Could not generate analysis.",
      outreachAngle: "Focus on their missing social media presence.",
      websiteScore: p.website ? 40 : 0,
      socialScore: Math.round((presentCount / 7) * 100),
    };
  }
}

// ── Main research function ────────────────────────────────────────────────────

export async function researchLead(leadId: string): Promise<{ success: boolean; data?: object; error?: string }> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { success: false, error: "Lead not found" };

  let email = lead.email ?? undefined;
  let phone = lead.phone ?? undefined;
  let instagram = lead.instagram ?? undefined;
  let facebook = lead.facebook ?? undefined;
  let linkedin = lead.linkedin ?? undefined;
  let youtube = lead.youtube ?? undefined;
  let twitter = lead.twitter ?? undefined;
  let whatsapp = lead.whatsapp ?? undefined;
  let gmb = lead.gmb ?? lead.mapUrl ?? undefined;
  let websiteTitle = "";
  let websiteDesc = "";

  // ── Scrape website with Firecrawl ─────────────────────────────────────────
  if (lead.website) {
    const [mainPage, contactPage] = await Promise.all([
      firecrawlScrape(lead.website),
      firecrawlContact(lead.website),
    ]);

    const combinedMarkdown = [mainPage?.markdown ?? "", contactPage?.markdown ?? ""].join("\n");
    const allLinks = [...(mainPage?.links ?? []), ...(contactPage?.links ?? [])];

    websiteTitle = mainPage?.metadata?.title ?? "";
    websiteDesc = mainPage?.metadata?.description ?? "";

    // Extract contact info from scraped text
    const foundEmails = extractEmails(combinedMarkdown);
    const foundPhones = extractPhones(combinedMarkdown);
    const foundSocial = extractSocialFromLinks(allLinks);

    email = email ?? foundEmails[0];
    phone = phone ?? foundPhones[0];
    instagram = instagram ?? foundSocial.instagram ?? undefined;
    facebook = facebook ?? foundSocial.facebook ?? undefined;
    linkedin = linkedin ?? foundSocial.linkedin ?? undefined;
    youtube = youtube ?? foundSocial.youtube ?? undefined;
    twitter = twitter ?? foundSocial.twitter ?? undefined;
    whatsapp = whatsapp ?? foundSocial.whatsapp ?? undefined;
    gmb = gmb ?? foundSocial.gmb ?? undefined;
  }

  // ── Verify social profiles exist ─────────────────────────────────────────
  const [igOk, fbOk, liOk, ytOk] = await Promise.all([
    checkUrl(instagram ?? null),
    checkUrl(facebook ?? null),
    checkUrl(linkedin ?? null),
    checkUrl(youtube ?? null),
  ]);

  // Clear profiles that returned 404
  if (!igOk) instagram = undefined;
  if (!fbOk) facebook = undefined;
  if (!liOk) linkedin = undefined;
  if (!ytOk) youtube = undefined;

  // ── Claude analysis ───────────────────────────────────────────────────────
  const analysis = await analyzeGaps({
    businessName: lead.businessName,
    industry: lead.industry ?? undefined,
    location: lead.location ?? undefined,
    address: lead.address ?? undefined,
    rating: lead.rating ?? undefined,
    reviewCount: lead.reviewCount ?? undefined,
    website: lead.website ?? undefined,
    websiteTitle,
    websiteDesc,
    email,
    phone,
    instagram,
    facebook,
    linkedin,
    youtube,
    twitter,
    whatsapp,
    gmb,
  });

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: {
      email: email ?? null,
      phone: phone ?? null,
      whatsapp: whatsapp ?? null,
      instagram: instagram ?? null,
      facebook: facebook ?? null,
      linkedin: linkedin ?? null,
      youtube: youtube ?? null,
      twitter: twitter ?? null,
      gmb: gmb ?? null,
      websiteScore: analysis.websiteScore,
      socialScore: analysis.socialScore,
      gaps: JSON.stringify(analysis.gaps),
      weaknesses: analysis.weaknesses,
      outreachAngle: analysis.outreachAngle,
      lastResearched: new Date(),
    },
  });

  return { success: true, data: updated };
}
