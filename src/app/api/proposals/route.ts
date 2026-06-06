import { NextRequest, NextResponse } from "next/server";
import { generateProposal } from "@/lib/agents/proposal-agent";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await generateProposal({
    leadId: body.leadId,
    selectedServices: body.services,
    pricingTier: body.tier ?? "standard",
    agencyName: process.env.AGENCY_NAME,
  });
  return NextResponse.json(result);
}

export async function GET() {
  const proposals = await prisma.proposal.findMany({
    include: { lead: { select: { businessName: true, industry: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(proposals);
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  const updated = await prisma.proposal.update({ where: { id }, data: { status } });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.proposal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
