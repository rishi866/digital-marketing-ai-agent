import { askClaude } from "../anthropic";
import { prisma } from "../db";
import nodemailer from "nodemailer";

interface EmailDraft {
  subject: string;
  body: string;
}

export async function generateColdEmail(params: {
  businessName: string;
  industry?: string;
  location?: string;
  notes?: string;
  senderName?: string;
  agencyName?: string;
}): Promise<EmailDraft> {
  const {
    businessName,
    industry = "your industry",
    location = "your area",
    notes = "",
    senderName = "Your Name",
    agencyName = "Your Agency",
  } = params;

  const prompt = `
Write a highly personalized cold outreach email for a digital marketing agency.

Prospect details:
- Business: ${businessName}
- Industry: ${industry}
- Location: ${location}
- Notes: ${notes}

Sender:
- Name: ${senderName}
- Agency: ${agencyName}

Requirements:
- Subject line: Short, curiosity-driven, personalized (max 8 words)
- Email body: 3-4 short paragraphs, conversational not salesy
- Start with a genuine observation about their business/industry
- Mention 1-2 specific pain points common in ${industry}
- End with a soft CTA (15-min call, not "buy now")
- Under 200 words total
- NO generic phrases like "I hope this email finds you well"
- Sign with: ${senderName} from ${agencyName}

Respond ONLY with valid JSON: {"subject": "...", "body": "..."}`;

  const result = await askClaude(prompt);
  try {
    const cleaned = result.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as EmailDraft;
  } catch {
    return {
      subject: `Quick question about ${businessName}'s marketing`,
      body: result,
    };
  }
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  leadId: string;
}) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `${process.env.SENDER_NAME ?? "Agency"} <${process.env.SMTP_USER}>`,
    to: params.to,
    subject: params.subject,
    text: params.body,
    html: params.body.replace(/\n/g, "<br>"),
  });

  await prisma.outreachLog.create({
    data: {
      leadId: params.leadId,
      subject: params.subject,
      body: params.body,
      channel: "email",
    },
  });

  await prisma.lead.update({
    where: { id: params.leadId },
    data: { status: "contacted" },
  });
}

export async function generateLinkedInDM(params: {
  businessName: string;
  ownerName?: string;
  industry?: string;
  notes?: string;
  senderName?: string;
}): Promise<string> {
  const prompt = `
Write a LinkedIn connection request message for a digital marketing agency.

Target: ${params.ownerName ?? "Business owner"} at ${params.businessName}
Industry: ${params.industry ?? "business"}
Notes: ${params.notes ?? ""}
Sender: ${params.senderName ?? "You"}

Requirements:
- Max 300 characters (LinkedIn limit for connection requests)
- Personal, not spammy
- Mention something specific about their business or industry
- No hard sell, just open a conversation

Respond with only the message text.`;

  return askClaude(prompt);
}
