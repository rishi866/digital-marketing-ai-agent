import { NextRequest, NextResponse } from "next/server";
import { generateColdEmail, generateLinkedInDM, sendEmail } from "@/lib/agents/outreach-agent";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === "generate_email") {
    const draft = await generateColdEmail({
      businessName: body.businessName,
      industry: body.industry,
      location: body.location,
      notes: body.notes,
      senderName: process.env.SENDER_NAME,
      agencyName: process.env.AGENCY_NAME,
    });
    return NextResponse.json(draft);
  }

  if (action === "send_email") {
    if (!body.to || !body.subject || !body.body || !body.leadId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    await sendEmail({ to: body.to, subject: body.subject, body: body.body, leadId: body.leadId });
    return NextResponse.json({ success: true });
  }

  if (action === "linkedin_dm") {
    const message = await generateLinkedInDM({
      businessName: body.businessName,
      ownerName: body.ownerName,
      industry: body.industry,
      notes: body.notes,
      senderName: process.env.SENDER_NAME,
    });
    return NextResponse.json({ message });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET() {
  const logs = await prisma.outreachLog.findMany({
    include: { lead: { select: { businessName: true, status: true } } },
    orderBy: { sentAt: "desc" },
    take: 50,
  });
  return NextResponse.json(logs);
}
