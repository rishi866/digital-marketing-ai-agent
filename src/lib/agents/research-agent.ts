import { askClaude } from "../anthropic";
import { prisma } from "../db";

interface ScrapedData {
  emails: string[];
  phones: string[];
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  youtube: string | null;
  twitter: string | null;
  gmb: string | null;
  title: string;
  description: string;
  hasContactPage: boolean;
  raw: string;
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

async function fetchHTML(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

function extractEmails(html: string): string[] {
  const raw = html.replace(/mailto:/gi, " ");
  const found = raw.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [];
  // filter out image/css/js files
  return [...new Set(found.filter((e) =>
    !e.match(/\.(png|jpg|jpeg|gif|svg|css|js|woff|ttf)$/i) &&
    !e.includes("sentry") && !e.includes("example")
  ))].slice(0, 3);
}

function extractPhones(html: string): string[] {
  // Indian & international numbers
  const patterns = [
    /(\+91[\s\-]?)?[6-9]\d{9}/g,
    /\+1[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}/g,
    /\(\d{3,4}\)[\s\-]?\d{6,8}/g,
  ];
  const found: string[] = [];
  for (const p of patterns) {
    const matches = html.match(p) ?? [];
    found.push(...matches.map((m) => m.replace(/\s/g, "")));
  }
  return [...new Set(found)].slice(0, 3);
}

function extractSocial(html: string) {
  const get = (pattern: RegExp) => {
    const m = html.match(pattern);
    return m ? m[0].replace(/['"]/g, "") : null;
  };

  return {
    instagram: get(/https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]{2,}/),
    facebook: get(/https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9._%\-]{2,}/),
    linkedin: get(/https?:\/\/(www\.)?linkedin\.com\/(company|in|school)\/[a-zA-Z0-9\-_%]{2,}/),
    youtube: get(/https?:\/\/(www\.)?youtube\.com\/(channel\/|c\/|user\/|@)[a-zA-Z0-9_\-]{2,}/),
    twitter: get(/https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]{2,}/),
    gmb: get(/https?:\/\/maps\.google\.com\/[^\s"']*/),
    whatsapp: (() => {
      const m = html.match(/wa\.me\/(\d{10,13})/);
      return m ? `https://wa.me/${m[1]}` : null;
    })(),
  };
}

function extractMeta(html: string) {
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
  const description = html.match(/name="description"\s+content="([^"]+)"/i)?.[1]?.trim() ?? "";
  const hasContactPage = /contact|about|reach|inquiry/i.test(html);
  return { title, description, hasContactPage };
}

async function scrapeWebsite(rawUrl: string): Promise<ScrapedData> {
  let url = rawUrl.trim();
  if (!url.startsWith("http")) url = "https://" + url;

  let html = await fetchHTML(url);

  // Try www if direct fails
  if (!html && !url.includes("www.")) {
    url = url.replace("https://", "https://www.");
    html = await fetchHTML(url);
  }

  // Also check /contact page for emails
  let contactHtml = "";
  if (html) {
    const base = url.replace(/\/$/, "");
    contactHtml = await fetchHTML(`${base}/contact`);
    if (!contactHtml) contactHtml = await fetchHTML(`${base}/contact-us`);
  }

  const combined = html + " " + contactHtml;
  const social = extractSocial(combined);
  const meta = extractMeta(html);

  return {
    emails: extractEmails(combined),
    phones: extractPhones(combined),
    whatsapp: social.whatsapp,
    instagram: social.instagram,
    facebook: social.facebook,
    linkedin: social.linkedin,
    youtube: social.youtube,
    twitter: social.twitter,
    gmb: social.gmb,
    hasContactPage: meta.hasContactPage,
    title: meta.title,
    description: meta.description,
    raw: combined.slice(0, 3000),
  };
}

async function checkSocialPresence(url: string | null): Promise<boolean> {
  if (!url) return false;
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    return res.ok && res.status !== 404;
  } catch {
    return false;
  }
}

async function analyzeWithClaude(params: {
  businessName: string;
  industry?: string;
  location?: string;
  scraped: ScrapedData;
  hasWebsite: boolean;
  socialPresence: Record<string, boolean>;
}): Promise<{ gaps: string[]; weaknesses: string; outreachAngle: string; websiteScore: number; socialScore: number }> {
  const { businessName, industry, location, scraped, hasWebsite, socialPresence } = params;

  const presentPlatforms = Object.entries(socialPresence).filter(([, v]) => v).map(([k]) => k);
  const missingPlatforms = Object.entries(socialPresence).filter(([, v]) => !v).map(([k]) => k);

  const prompt = `
You are a digital marketing analyst. Research this business and identify their online marketing weaknesses.

Business: ${businessName}
Industry: ${industry ?? "unknown"}
Location: ${location ?? "unknown"}

ONLINE PRESENCE AUDIT:
- Website: ${hasWebsite ? `YES (Title: "${scraped.title}", Desc: "${scraped.description}")` : "NO WEBSITE FOUND"}
- Email found: ${scraped.emails.length > 0 ? scraped.emails.join(", ") : "None"}
- Phone found: ${scraped.phones.length > 0 ? "Yes" : "None"}
- Instagram: ${socialPresence.instagram ? "ACTIVE" : "MISSING"}
- Facebook: ${socialPresence.facebook ? "ACTIVE" : "MISSING"}
- LinkedIn: ${socialPresence.linkedin ? "ACTIVE" : "MISSING"}
- YouTube: ${socialPresence.youtube ? "ACTIVE" : "MISSING"}
- WhatsApp Business: ${scraped.whatsapp ? "YES" : "NO"}
- Google Maps/GMB: ${scraped.gmb ? "YES" : "NO"}

Active on: ${presentPlatforms.length > 0 ? presentPlatforms.join(", ") : "Nothing"}
Missing: ${missingPlatforms.join(", ")}

Provide a JSON response with exactly these keys:
{
  "gaps": ["list of specific missing/weak things (max 8, each under 15 words)"],
  "weaknesses": "2-3 paragraph honest analysis of their digital marketing weaknesses. Be specific to their industry. Mention what competitors likely have that they don't.",
  "outreachAngle": "1 paragraph: the BEST cold email angle to use with this specific business. What pain point to hit first, what to offer, what result to promise.",
  "websiteScore": <0-100 score of website quality>,
  "socialScore": <0-100 score of social media presence>
}

Only respond with valid JSON.`;

  const result = await askClaude(prompt);
  try {
    const cleaned = result.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      gaps: missingPlatforms.map((p) => `No ${p} presence`),
      weaknesses: "Unable to analyze automatically. Please review their online presence manually.",
      outreachAngle: `Focus on their missing ${missingPlatforms[0] ?? "social media"} presence.`,
      websiteScore: hasWebsite ? 40 : 0,
      socialScore: Math.round((presentPlatforms.length / 6) * 100),
    };
  }
}

export async function researchLead(leadId: string): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { success: false, error: "Lead not found" };

  let scraped: ScrapedData = {
    emails: [], phones: [], whatsapp: null, instagram: null,
    facebook: null, linkedin: null, youtube: null, twitter: null,
    gmb: null, hasContactPage: false, title: "", description: "", raw: "",
  };

  const hasWebsite = !!lead.website;

  if (lead.website) {
    scraped = await scrapeWebsite(lead.website);
  }

  // Check social presence in parallel
  const [igOk, fbOk, liOk, ytOk] = await Promise.all([
    checkSocialPresence(scraped.instagram),
    checkSocialPresence(scraped.facebook),
    checkSocialPresence(scraped.linkedin),
    checkSocialPresence(scraped.youtube),
  ]);

  const socialPresence = {
    instagram: igOk,
    facebook: fbOk,
    linkedin: liOk,
    youtube: ytOk,
    whatsapp: !!scraped.whatsapp,
    gmb: !!scraped.gmb,
  };

  const analysis = await analyzeWithClaude({
    businessName: lead.businessName,
    industry: lead.industry ?? undefined,
    location: lead.location ?? undefined,
    scraped,
    hasWebsite,
    socialPresence,
  });

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: {
      email: scraped.emails[0] ?? lead.email ?? null,
      phone: scraped.phones[0] ?? lead.phone ?? null,
      whatsapp: scraped.whatsapp ?? lead.whatsapp ?? null,
      instagram: scraped.instagram ?? lead.instagram ?? null,
      facebook: scraped.facebook ?? lead.facebook ?? null,
      linkedin: scraped.linkedin ?? lead.linkedin ?? null,
      youtube: scraped.youtube ?? lead.youtube ?? null,
      twitter: scraped.twitter ?? lead.twitter ?? null,
      gmb: scraped.gmb ?? lead.gmb ?? null,
      websiteScore: analysis.websiteScore,
      socialScore: analysis.socialScore,
      gaps: JSON.stringify(analysis.gaps),
      weaknesses: analysis.weaknesses,
      outreachAngle: analysis.outreachAngle,
      lastResearched: new Date(),
    },
  });

  return { success: true, data: updated as unknown as Record<string, unknown> };
}

export async function researchLeadByName(params: {
  businessName: string;
  location?: string;
  industry?: string;
}): Promise<{ gaps: string[]; weaknesses: string; outreachAngle: string }> {
  // No website — use Claude to analyze based on industry + location alone
  const prompt = `
You are a digital marketing analyst helping identify potential clients.

Business: ${params.businessName}
Industry: ${params.industry ?? "local business"}
Location: ${params.location ?? "India"}

Based on typical businesses in this industry and location, analyze what digital marketing gaps they LIKELY have.
Note: We don't have their actual website/social data, so base this on industry patterns.

Respond with JSON:
{
  "gaps": ["list of 5-7 likely gaps for this type of business"],
  "weaknesses": "2 paragraphs on common digital marketing weaknesses for ${params.industry ?? "this industry"} businesses in India",
  "outreachAngle": "Best cold email angle for this type of business"
}`;

  const result = await askClaude(prompt);
  try {
    const cleaned = result.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      gaps: ["No website", "No Instagram", "No Google My Business", "No email marketing"],
      weaknesses: "Analysis unavailable.",
      outreachAngle: "Focus on their online visibility gap.",
    };
  }
}
