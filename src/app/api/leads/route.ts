import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveLead, generateLeadsFromNiche } from "@/lib/agents/lead-agent";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);

  const where = status ? { status } : {};

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { score: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { outreachLogs: true, followUps: true } } },
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({ leads, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "generate") {
    const leads = await generateLeadsFromNiche(
      body.niche ?? "restaurant",
      body.location ?? "Mumbai",
      body.count ?? 10
    );
    const saved = await Promise.all(leads.map(saveLead));
    return NextResponse.json({ saved, count: saved.length });
  }

  const lead = await saveLead(body);
  return NextResponse.json(lead, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  const lead = await prisma.lead.update({ where: { id }, data });
  return NextResponse.json(lead);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
