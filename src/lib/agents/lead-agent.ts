import { askClaude } from "../anthropic";
import { prisma } from "../db";

export interface LeadInput {
  businessName: string;
  website?: string;
  email?: string;
  phone?: string;
  industry?: string;
  location?: string;
  notes?: string;
}

export async function scoreLead(lead: LeadInput): Promise<number> {
  const prompt = `
Score this business lead for a full-service digital marketing agency (0-100).
Higher score = better prospect.

Business: ${lead.businessName}
Website: ${lead.website ?? "none"}
Email available: ${lead.email ? "yes" : "no"}
Industry: ${lead.industry ?? "unknown"}
Location: ${lead.location ?? "unknown"}
Notes: ${lead.notes ?? "none"}

Scoring criteria:
- Has email contact: +20 pts
- Has a website (can be improved): +15 pts
- Is in a high-value industry (restaurant, real estate, e-commerce, clinic, salon, gym, law): +20 pts
- Local business (more likely to need local marketing): +10 pts
- Notes suggest pain points: +15 pts
- No website at all (big opportunity): +20 pts

Respond with ONLY a number between 0 and 100.`;

  const result = await askClaude(prompt);
  const score = parseInt(result.trim(), 10);
  return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
}

export async function generateLeadsFromNiche(
  niche: string,
  location: string,
  count: number = 10
): Promise<LeadInput[]> {
  const prompt = `
Generate ${count} realistic potential client leads for a digital marketing agency.
Target niche: ${niche}
Target location: ${location}

For each lead provide:
- businessName: realistic local business name
- industry: the specific industry
- location: city/area
- notes: 1-2 sentences about their likely marketing pain points

Respond ONLY with valid JSON array of objects with keys: businessName, industry, location, notes
No extra text, just the JSON array.`;

  const result = await askClaude(prompt);

  try {
    const cleaned = result.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as LeadInput[];
  } catch {
    return [];
  }
}

export async function saveLead(input: LeadInput) {
  const score = await scoreLead(input);
  return prisma.lead.create({
    data: { ...input, score },
  });
}

export async function getLeadInsights(leadId: string): Promise<string> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { outreachLogs: true, followUps: true },
  });

  if (!lead) return "Lead not found.";

  const prompt = `
Analyze this lead and provide actionable insights for the sales team.

Business: ${lead.businessName}
Industry: ${lead.industry ?? "unknown"}
Location: ${lead.location ?? "unknown"}
Status: ${lead.status}
Score: ${lead.score}/100
Notes: ${lead.notes ?? "none"}
Outreach attempts: ${lead.outreachLogs.length}
Follow-ups scheduled: ${lead.followUps.length}

Provide:
1. Why this is a good/bad prospect
2. What services to pitch first
3. Recommended next action
4. Key talking points specific to their industry`;

  return askClaude(prompt);
}
