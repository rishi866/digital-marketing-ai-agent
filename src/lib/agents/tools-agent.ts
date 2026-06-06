import { askClaude } from "../anthropic";

// ── Objection Handler ─────────────────────────────────────────────────────────

export async function handleObjection(params: {
  businessName: string;
  industry?: string;
  originalPitch?: string;
  prospectReply: string;
  agencyName?: string;
}) {
  const prompt = `
You are a senior sales closer at a digital marketing agency.

CONTEXT:
- Prospect: ${params.businessName} (${params.industry ?? "local business"})
- Your agency: ${params.agencyName ?? "Your Agency"}
${params.originalPitch ? `- Your original pitch: "${params.originalPitch.slice(0, 300)}..."` : ""}
- Their reply: "${params.prospectReply}"

TASK:
1. Identify the EXACT objection type (price / timing / already have someone / not interested / need to think / trust)
2. Write a reply that overcomes it

Rules:
- Acknowledge their concern genuinely first
- Don't be defensive or pushy
- Reframe the objection as a reason TO act
- End with a soft close (specific question or micro-commitment)
- Max 120 words
- Sound human

Respond as JSON: {
  "objectionType": "...",
  "reply": "..."
}`;

  const result = await askClaude(prompt);
  try {
    return JSON.parse(result.replace(/```json|```/g, "").trim());
  } catch {
    return { objectionType: "unknown", reply: result };
  }
}

// ── Reply Analyzer ────────────────────────────────────────────────────────────

export async function analyzeReply(params: {
  businessName: string;
  industry?: string;
  prospectReply: string;
}) {
  const prompt = `
Analyze this prospect reply for a digital marketing agency sales team.

Prospect: ${params.businessName} (${params.industry ?? "local business"})
Their reply: "${params.prospectReply}"

Provide:
1. Temperature: hot / warm / cold / dead
2. Intent signals (what clues suggest interest or disinterest)
3. Hidden objections (what they didn't say but might be thinking)
4. Recommended next action (very specific)
5. Suggested response (ready to send, under 80 words)

Respond as JSON: {
  "temperature": "hot|warm|cold|dead",
  "temperatureReason": "...",
  "intentSignals": ["...", "..."],
  "hiddenObjections": ["...", "..."],
  "nextAction": "...",
  "suggestedReply": "..."
}`;

  const result = await askClaude(prompt);
  try {
    return JSON.parse(result.replace(/```json|```/g, "").trim());
  } catch {
    return { temperature: "unknown", suggestedReply: result };
  }
}

// ── Cold Call Script ──────────────────────────────────────────────────────────

export async function generateCallScript(params: {
  businessName: string;
  ownerName?: string;
  industry?: string;
  location?: string;
  topGap?: string;
  agencyName?: string;
  senderName?: string;
}) {
  const prompt = `
Write a cold call script for a digital marketing agency.

TARGET:
- Business: ${params.businessName}
- Owner: ${params.ownerName ?? "the owner"}
- Industry: ${params.industry ?? "local business"}
- Location: ${params.location ?? "India"}
- Main weakness to lead with: ${params.topGap ?? "low online visibility"}

CALLER: ${params.senderName ?? "You"} from ${params.agencyName ?? "Your Agency"}

Write:
1. Opening (first 15 seconds — grab attention, don't sound like a salesperson)
2. Hook statement (the one thing that makes them listen)
3. Qualifying question (find out if they're the right person to talk to)
4. Pain point reveal (make them feel the problem)
5. Bridge to solution (1 sentence)
6. Soft CTA (book a 15-min call, not "buy now")
7. Handling top 3 objections:
   - "Not interested"
   - "Already have someone"
   - "Send me an email"

Format clearly with labels. Keep the whole script under 400 words. Sound natural when spoken aloud.`;

  return askClaude(prompt);
}

// ── WhatsApp Pitch ────────────────────────────────────────────────────────────

export async function generateWhatsAppPitch(params: {
  businessName: string;
  industry?: string;
  location?: string;
  topGap?: string;
  ownerName?: string;
  senderName?: string;
  agencyName?: string;
}) {
  const prompt = `
Write a WhatsApp cold outreach message for a digital marketing agency.

Target: ${params.ownerName ?? "Business owner"} at ${params.businessName}
Industry: ${params.industry ?? "local business"}
Location: ${params.location ?? "India"}
Their main weakness: ${params.topGap ?? "low online visibility"}
Sender: ${params.senderName ?? "You"} from ${params.agencyName ?? "Your Agency"}

Rules:
- Max 120 words — WhatsApp messages must be SHORT
- Casual, friendly tone — like texting a contact
- Start with their name if known
- Mention ONE specific thing about their business
- End with a yes/no question (easiest to reply to)
- No long paragraphs — use line breaks
- No formal language, no "Dear Sir/Madam"

Respond with only the WhatsApp message text.`;

  return askClaude(prompt);
}

// ── Competitor Comparison Pitch ───────────────────────────────────────────────

export async function generateCompetitorPitch(params: {
  businessName: string;
  competitorName: string;
  industry?: string;
  prospectGaps: string[];
  competitorStrengths: string[];
  agencyName?: string;
  senderName?: string;
}) {
  const prompt = `
Write a highly personalized cold email that uses a competitor comparison to create urgency.

PROSPECT: ${params.businessName} (${params.industry ?? "local business"})
COMPETITOR: ${params.competitorName}

PROSPECT'S WEAKNESSES:
${params.prospectGaps.map((g) => `- ${g}`).join("\n")}

COMPETITOR'S ADVANTAGES:
${params.competitorStrengths.map((s) => `- ${s}`).join("\n")}

SENDER: ${params.senderName ?? "You"} from ${params.agencyName ?? "Your Agency"}

Write a 150-word cold email that:
1. Opens by mentioning the competitor (by name) and ONE thing they're doing better
2. Shows what this means for the prospect's business (lost customers/revenue)
3. Offers a specific solution
4. Ends with a soft CTA

Make it feel researched, not templated. Don't be insulting about the competitor.

Respond as JSON: {"subject": "...", "body": "..."}`;

  const result = await askClaude(prompt);
  try {
    return JSON.parse(result.replace(/```json|```/g, "").trim());
  } catch {
    return { subject: `${params.competitorName} is getting your customers`, body: result };
  }
}
