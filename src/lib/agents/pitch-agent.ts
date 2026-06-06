import { askClaude } from "../anthropic";
import { prisma } from "../db";

const GAP_SERVICE_MAP: Record<string, { service: string; pain: string; result: string }> = {
  "no website":            { service: "Website Design & SEO",        pain: "losing customers who search online",              result: "get found on Google in 30 days" },
  "no instagram":          { service: "Instagram Management",         pain: "invisible where customers scroll daily",           result: "3x footfall from Instagram in 60 days" },
  "no facebook":           { service: "Facebook Page & Ads",          pain: "missing local community customers",               result: "reach 10,000 local people for ₹5,000/mo" },
  "no linkedin":           { service: "LinkedIn Brand Building",       pain: "not visible to B2B clients & partners",           result: "build credibility with decision-makers" },
  "no youtube":            { service: "Video Marketing",              pain: "competitors with video get 3x more trust",        result: "brand video that converts viewers to visitors" },
  "no whatsapp":           { service: "WhatsApp Business Setup",      pain: "customers can't instantly reach you",             result: "never miss an inquiry again" },
  "no google maps":        { service: "Local SEO & GMB Setup",        pain: "invisible in 'near me' searches",                 result: "show in top 3 Google Maps results" },
  "low google reviews":    { service: "Reputation Management",        pain: "low reviews are scaring customers away",          result: "50+ 5-star reviews in 90 days" },
  "bad website":           { service: "Website Redesign & Optimisation", pain: "website is losing you customers on mobile",    result: "turn your site into a 24/7 salesperson" },
  "no email marketing":    { service: "Email Marketing Setup",        pain: "no way to re-engage past customers",              result: "bring back 20% of old customers every month" },
  "no twitter":            { service: "Twitter/X Brand Presence",     pain: "missing viral & trending conversations",          result: "build thought leadership in your niche" },
  "no paid ads":           { service: "Google & Meta Ads Management", pain: "only getting walk-in traffic, no online leads",  result: "generate 50+ qualified leads/month from ads" },
};

function matchGapToService(gap: string) {
  const lower = gap.toLowerCase();
  for (const [key, val] of Object.entries(GAP_SERVICE_MAP)) {
    if (lower.includes(key.replace("no ", "")) || lower.includes(key)) {
      return val;
    }
  }
  return { service: "Digital Marketing", pain: gap, result: "measurable growth in 60 days" };
}

export async function generateWeaknessPitch(params: {
  leadId: string;
  selectedGap: string;
  channel: "email" | "whatsapp" | "linkedin";
  senderName?: string;
  agencyName?: string;
}) {
  const lead = await prisma.lead.findUnique({ where: { id: params.leadId } });
  if (!lead) throw new Error("Lead not found");

  const mapped = matchGapToService(params.selectedGap);
  const caseStudies = await prisma.caseStudy.findMany({ take: 3 });

  const caseStudyText = caseStudies.length > 0
    ? caseStudies.map((c) => `- ${c.clientType}: ${c.service} → ${c.result}`).join("\n")
    : "";

  const channelGuide = {
    email:    "professional cold email, 150-200 words, subject line + body, soft CTA for 15-min call",
    whatsapp: "casual WhatsApp message, max 150 words, conversational, end with a question",
    linkedin: "LinkedIn connection request, max 300 characters, personal and curious",
  }[params.channel];

  const prompt = `
You are writing outreach for a digital marketing agency targeting a specific business weakness.

PROSPECT:
- Business: ${lead.businessName}
- Industry: ${lead.industry ?? "local business"}
- Location: ${lead.location ?? "India"}
- Rating: ${lead.rating ? `${lead.rating}/5 (${lead.reviewCount} reviews)` : "unknown"}
- Website: ${lead.website ?? "NONE"}

SELECTED WEAKNESS TO PITCH ON:
"${params.selectedGap}"

SERVICE TO OFFER: ${mapped.service}
PAIN TO HIT: ${mapped.pain}
RESULT TO PROMISE: ${mapped.result}

${caseStudyText ? `OUR PROOF (use naturally if relevant):\n${caseStudyText}` : ""}

SENDER: ${params.senderName ?? "Your Name"} from ${params.agencyName ?? "Your Agency"}

FORMAT: ${channelGuide}

Rules:
- Open with ONE specific observation about their business/weakness — make it feel researched
- Never say "I hope this finds you well"
- Lead with the pain, then offer the solution briefly
- The result promise must be specific and believable
- Sound human, not like a template
${params.channel === "email" ? '\nRespond as JSON: {"subject": "...", "body": "..."}' : "\nRespond with only the message text."}`;

  const result = await askClaude(prompt);

  if (params.channel === "email") {
    try {
      const cleaned = result.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned) as { subject: string; body: string };
    } catch {
      return { subject: `Quick question about ${lead.businessName}`, body: result };
    }
  }

  return { message: result };
}

export function getAllGapOptions(gaps: string[]): Array<{ gap: string; service: string; pain: string }> {
  return gaps.map((gap) => {
    const mapped = matchGapToService(gap);
    return { gap, service: mapped.service, pain: mapped.pain };
  });
}
