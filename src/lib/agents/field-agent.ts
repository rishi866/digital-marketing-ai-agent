import { askClaude } from "../anthropic";

export interface MeetingBrief {
  businessName: string;
  category: string;
  address: string;
  phone: string;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  mapUrl: string | null;

  // Presence audit
  hasWebsite: boolean;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  whatsapp: string | null;
  gmb: string | null;
  presenceScore: number; // 0-100

  // AI-generated brief
  gaps: string[];
  talkingPoints: string[];      // numbered, for verbal use in meeting
  openingLine: string;          // first thing to say
  pitchServices: string[];      // top 2-3 services to recommend
  objectionHandles: { objection: string; response: string }[];
  closingAsk: string;           // how to end the meeting
  whyNow: string;               // urgency angle
}

// ── Search Google Maps via Apify ────────────────────────────────────────────

async function searchBusiness(name: string, location: string) {
  const key = process.env.APIFY_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${key}&timeout=90`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchStringsArray: [`${name} ${location}`],
          maxCrawledPlacesPerSearch: 3,
          language: "en",
          maxImages: 0,
          maxReviews: 0,
          scrapeContacts: false,
        }),
        signal: AbortSignal.timeout(330_000),
      }
    );
    if (!res.ok) return null;
    const items = await res.json();
    return items[0] ?? null;
  } catch {
    return null;
  }
}

// ── Scrape website via Firecrawl ────────────────────────────────────────────

async function scrapeWebsite(url: string): Promise<{ markdown: string; links: string[] } | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key || !url) return null;

  try {
    let cleanUrl = url.startsWith("http") ? url : "https://" + url;
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: cleanUrl, formats: ["markdown", "links"], onlyMainContent: false, timeout: 15000 }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data ?? null;
  } catch {
    return null;
  }
}

function extractSocials(links: string[]) {
  const find = (d: string) => links.find(l => l.includes(d) && !l.includes("share")) ?? null;
  return {
    instagram: find("instagram.com/"),
    facebook: find("facebook.com/"),
    youtube: find("youtube.com/"),
    twitter: find("twitter.com/") ?? find("x.com/"),
    whatsapp: links.find(l => l.includes("wa.me/")) ?? null,
  };
}

// ── Claude Meeting Brief ────────────────────────────────────────────────────

async function generateMeetingBrief(params: {
  businessName: string;
  category: string;
  location: string;
  address: string;
  phone: string;
  rating: number | null;
  reviewCount: number | null;
  hasWebsite: boolean;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  whatsapp: string | null;
  gmb: string | null;
  agencyName?: string;
}) {
  const present = [params.hasWebsite && "Website", params.instagram && "Instagram", params.facebook && "Facebook", params.youtube && "YouTube", params.whatsapp && "WhatsApp", params.gmb && "Google Maps"].filter(Boolean);
  const missing = [!params.hasWebsite && "Website", !params.instagram && "Instagram", !params.facebook && "Facebook", !params.youtube && "YouTube", !params.whatsapp && "WhatsApp Business", !params.gmb && "Google My Business listing"].filter(Boolean);

  const presenceScore = Math.round((present.length / 6) * 100);

  const prompt = `
You are briefing a field sales agent who is about to walk into a shop for a face-to-face meeting.
Write a sharp, practical meeting brief they can read in 60 seconds.

BUSINESS:
- Name: ${params.businessName}
- Category: ${params.category}
- Location: ${params.address || params.location}
- Phone: ${params.phone || "not found"}
- Google Rating: ${params.rating ? `${params.rating}/5 (${params.reviewCount} reviews)` : "not found"}

ONLINE PRESENCE AUDIT:
- Website: ${params.hasWebsite ? `✅ ${params.website}` : "❌ NONE"}
- Instagram: ${params.instagram ? "✅" : "❌ Missing"}
- Facebook: ${params.facebook ? "✅" : "❌ Missing"}
- YouTube: ${params.youtube ? "✅" : "❌ Missing"}
- WhatsApp Business: ${params.whatsapp ? "✅" : "❌ Missing"}
- Google My Business: ${params.gmb ? "✅" : "❌ Not claimed/missing"}
- Presence Score: ${presenceScore}/100

AGENCY: ${params.agencyName ?? "Digital Marketing Agency"}

Generate the meeting brief as JSON with these EXACT keys:

{
  "gaps": ["list of 5-7 specific things they're missing — short, punchy, e.g. 'No Instagram presence'"],

  "talkingPoints": [
    "1. [Opening hook — relate to their business/electronics industry specifically]",
    "2. [Pain point #1 — what they're losing without online presence]",
    "3. [Pain point #2 — what competitors are doing that they're not]",
    "4. [Social proof — mention a result you got for similar business]",
    "5. [The offer — what you can do for them specifically]",
    "6. [ROI angle — what they'll gain in 90 days]",
    "7. [Urgency — why start now not later]"
  ],

  "openingLine": "Exact first sentence to say when meeting the owner. Specific to electronics/appliances business. Not salesy — curious and observational.",

  "pitchServices": ["Top service 1 for this business type", "Top service 2", "Top service 3"],

  "objectionHandles": [
    {"objection": "Hum already social media pe hain", "response": "..."},
    {"objection": "Abhi budget nahi hai", "response": "..."},
    {"objection": "Pehle sochna padega", "response": "..."},
    {"objection": "Humara kaam referral se chal jaata hai", "response": "..."}
  ],

  "closingAsk": "Exact sentence to say at the end to book the next meeting/demo. Low pressure.",

  "whyNow": "1-2 sentences: why this specific business should act NOW — relate to festivals, competition, online shopping eating into local electronics stores, etc."
}

IMPORTANT: talkingPoints must be Hindi-English mix (Hinglish) since the field agent will speak in Hindi. Make them conversational, not formal.
Only respond with valid JSON.`;

  const result = await askClaude(prompt);
  try {
    return { ...JSON.parse(result.replace(/```json|```/g, "").trim()), presenceScore, present, missing };
  } catch {
    return {
      gaps: missing.map(m => `${m} missing`),
      talkingPoints: ["Their online presence needs improvement"],
      openingLine: `Maine dekha ki ${params.businessName} ki online visibility bahut kam hai`,
      pitchServices: ["Social Media Management", "Google My Business Setup", "Website Creation"],
      objectionHandles: [{ objection: "Budget nahi", response: "Hum ROI guarantee karte hain" }],
      closingAsk: "Kya hum ek 15-min demo schedule kar sakte hain?",
      whyNow: "Online shopping se local stores pe bahut pressure hai — ab sahi time hai.",
      presenceScore,
      present,
      missing,
    };
  }
}

// ── Main export ─────────────────────────────────────────────────────────────

export async function getFieldBrief(params: {
  businessName: string;
  location: string;
  agencyName?: string;
}): Promise<MeetingBrief & { talkingPoints: string[]; openingLine: string; pitchServices: string[]; objectionHandles: { objection: string; response: string }[]; closingAsk: string; whyNow: string; presenceScore: number }> {

  // Step 1: Search Google Maps
  const place = await searchBusiness(params.businessName, params.location);

  const businessName = place?.title ?? params.businessName;
  const website = place?.website ?? null;
  const phone = place?.phone ?? place?.phoneUnformatted ?? "";
  const address = place?.address ?? params.location;
  const category = place?.categoryName ?? "Electronics & Appliances";
  const rating = place?.totalScore ?? null;
  const reviewCount = place?.reviewsCount ?? null;
  const mapUrl = place?.url ?? null;

  // Step 2: Scrape website
  let instagram = null, facebook = null, youtube = null, whatsapp = null, gmb = mapUrl;

  if (website) {
    const scraped = await scrapeWebsite(website);
    if (scraped?.links) {
      const socials = extractSocials(scraped.links);
      instagram = socials.instagram;
      facebook = socials.facebook;
      youtube = socials.youtube;
      whatsapp = socials.whatsapp;
    }
  }

  // Also use Apify contact data if available
  if (place?.instagram) instagram = instagram ?? place.instagram;
  if (place?.facebook) facebook = facebook ?? place.facebook;

  // Step 3: Generate brief
  const brief = await generateMeetingBrief({
    businessName,
    category,
    location: params.location,
    address,
    phone,
    rating,
    reviewCount,
    hasWebsite: !!website,
    website,
    instagram,
    facebook,
    youtube,
    whatsapp,
    gmb,
    agencyName: params.agencyName,
  });

  return {
    businessName,
    category,
    address,
    phone,
    website,
    rating,
    reviewCount,
    mapUrl,
    hasWebsite: !!website,
    instagram,
    facebook,
    youtube,
    whatsapp,
    gmb,
    ...brief,
  };
}
