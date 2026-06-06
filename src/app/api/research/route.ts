import { NextRequest, NextResponse } from "next/server";
import { researchLead } from "@/lib/agents/research-agent";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { leadId } = await req.json();
  if (!leadId) return NextResponse.json({ error: "Missing leadId" }, { status: 400 });

  const result = await researchLead(leadId);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json(result.data);
}

export async function PATCH(req: NextRequest) {
  // Manual update of social/contact fields
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const updated = await prisma.lead.update({ where: { id }, data });
  return NextResponse.json(updated);
}
