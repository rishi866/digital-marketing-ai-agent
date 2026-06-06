import { NextRequest, NextResponse } from "next/server";
import {
  generateFollowUpSequence,
  scheduleFullSequence,
  getPendingFollowUps,
  analyzeConversation,
} from "@/lib/agents/followup-agent";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === "generate_sequence") {
    const sequence = await scheduleFullSequence({
      leadId: body.leadId,
      businessName: body.businessName,
      industry: body.industry,
    });
    return NextResponse.json({ sequence });
  }

  if (action === "generate_single") {
    const followUp = await generateFollowUpSequence({
      leadId: body.leadId,
      businessName: body.businessName,
      industry: body.industry,
      previousMessage: body.previousMessage,
      sequenceStep: body.step ?? 1,
    });
    return NextResponse.json(followUp);
  }

  if (action === "analyze") {
    const analysis = await analyzeConversation({
      leadId: body.leadId,
      conversationThread: body.thread,
    });
    return NextResponse.json({ analysis });
  }

  if (action === "mark_sent") {
    const updated = await prisma.followUp.update({
      where: { id: body.id },
      data: { status: "sent", sentAt: new Date() },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pending = searchParams.get("pending");

  if (pending === "true") {
    const followUps = await getPendingFollowUps();
    return NextResponse.json(followUps);
  }

  const leadId = searchParams.get("leadId");
  const where = leadId ? { leadId } : {};

  const followUps = await prisma.followUp.findMany({
    where,
    include: { lead: { select: { businessName: true } } },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });
  return NextResponse.json(followUps);
}
