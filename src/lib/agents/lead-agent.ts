import { askClaude } from "../anthropic";
import { prisma } from "../db";

export interface LeadInput {
  businessName: string;
  website?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  industry?: string;
  location?: string;
  address?: string;
  notes?: string;
  gmb?: string;
  mapUrl?: string;
  rating?: number;
  reviewCount?: number;
  instagram?: string;
  facebook?: string;
}

// ── Apify Google Maps real data ──────────────────────────────────────────────

interface ApifyPlace {
  title?: string;
  name?: string;
  website?: string;
  phone?: string;
  phoneUnformatted?: string;
  address?: string;
  city?: string;
  state?: string;
  categoryName?: string;
  categories?: string[];
  totalScore?: number;
  reviewsCount?: number;
  url?: string;                    // Google Maps URL
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
  instagram?: string;
  facebook?: string;
  description?: string;
}

export async function findRealLeadsApify(
  niche: string,
  location: string,
  count: number = 10
): Promise<LeadInput[]> {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) throw new Error("APIFY_API_KEY not set");

  const searchQuery = `${niche} in ${location}`;

  // Request extra to account for filtered/closed places
  const fetchCount = Math.ceil(count * 1.5) + 5;

  const res = await fetch(
    `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${apiKey}&timeout=300`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchStringsArray: [searchQuery],
        maxCrawledPlacesPerSearch: fetchCount,
        language: "en",
        maxImages: 0,
        maxReviews: 0,
        scrapeDirectories: false,
        deeperCityScrape: false,
        exportPlaceUrls: false,
        additionalInfo: false,
        scrapeContacts: false,
      }),
      signal: AbortSignal.timeout(330_000),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Apify error ${res.status}: ${err.slice(0, 200)}`);
  }

  const items: ApifyPlace[] = await res.json();

  return items
    .filter((p) => !p.permanentlyClosed && !p.temporarilyClosed)
    .slice(0, count)   // trim to exactly what was requested
    .map((p) => ({
      businessName: p.title ?? p.name ?? "Unknown",
      website: p.website,
      phone: p.phone ?? p.phoneUnformatted,
      industry: p.categoryName ?? (p.categories?.[0]) ?? niche,
      location: p.city ?? p.state ?? location,
      address: p.address,
      notes: p.description ? p.description.slice(0, 300) : undefined,
      mapUrl: p.url,
      gmb: p.url,
      rating: p.totalScore,
      reviewCount: p.reviewsCount,
      instagram: p.instagram,
      facebook: p.facebook,
    }));
}

// ── Score lead with Claude ────────────────────────────────────────────────────

export async function scoreLead(lead: LeadInput): Promise<number> {
  let score = 30; // base

  if (lead.email)       score += 20;
  if (lead.phone)       score += 10;
  if (lead.website)     score += 10;
  if (!lead.website)    score += 15; // no website = big opportunity
  if (lead.mapUrl)      score += 5;
  if (lead.rating && lead.rating < 4.0) score += 10; // bad reviews = needs help
  if (lead.reviewCount && lead.reviewCount < 20) score += 10; // low visibility

  // Industry bonus
  const highValue = ["restaurant", "clinic", "gym", "salon", "hotel", "real estate", "dental", "spa", "boutique"];
  if (lead.industry && highValue.some((h) => lead.industry!.toLowerCase().includes(h))) score += 10;

  return Math.min(100, score);
}

// ── Save lead to DB ───────────────────────────────────────────────────────────

export async function saveLead(input: LeadInput) {
  const score = await scoreLead(input);
  return prisma.lead.create({
    data: {
      businessName: input.businessName,
      website: input.website,
      email: input.email,
      phone: input.phone,
      whatsapp: input.whatsapp,
      industry: input.industry,
      location: input.location,
      address: input.address,
      notes: input.notes,
      gmb: input.gmb,
      mapUrl: input.mapUrl,
      rating: input.rating,
      reviewCount: input.reviewCount,
      instagram: input.instagram,
      facebook: input.facebook,
      score,
    },
  });
}

// ── AI fallback generator (when no API) ──────────────────────────────────────

export async function generateLeadsFromNiche(
  niche: string,
  location: string,
  count: number = 10
): Promise<LeadInput[]> {
  const prompt = `
Generate ${count} fictional but realistic-sounding local business leads for a digital marketing agency.
Target niche: ${niche}
Target location: ${location}, India

For each, provide:
- businessName: a realistic Indian local business name
- industry: specific sub-category
- location: neighborhood/area in ${location}
- address: plausible street address
- notes: 1-2 sentences on their likely marketing pain points

Respond ONLY with a valid JSON array. No extra text.
Keys: businessName, industry, location, address, notes`;

  const result = await askClaude(prompt);
  try {
    const cleaned = result.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as LeadInput[];
  } catch {
    return [];
  }
}

// ── Lead insights ─────────────────────────────────────────────────────────────

export async function getLeadInsights(leadId: string): Promise<string> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { outreachLogs: true, followUps: true },
  });
  if (!lead) return "Lead not found.";

  const prompt = `
Analyze this lead for a digital marketing agency sales team.

Business: ${lead.businessName}
Industry: ${lead.industry ?? "unknown"}
Location: ${lead.location ?? "unknown"}
Rating: ${lead.rating ? `${lead.rating}/5 (${lead.reviewCount} reviews)` : "unknown"}
Website: ${lead.website ?? "NONE"}
Status: ${lead.status}
Score: ${lead.score}/100
Outreach attempts: ${lead.outreachLogs.length}

Provide:
1. Why this is a good/bad prospect
2. What services to pitch first
3. Recommended next action
4. Key talking points specific to their industry`;

  return askClaude(prompt);
}
