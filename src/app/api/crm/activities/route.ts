import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const ALLOWED_TYPES = ["note", "call", "email", "meeting", "sms", "whatsapp", "status_change"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const activities = await prisma.activity.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ activities });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { leadId, type, title, bodyText, createdBy } = body;
  if (!leadId || !type || !title) {
    return NextResponse.json({ error: "leadId, type, title required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
  }

  const activity = await prisma.activity.create({
    data: {
      leadId,
      type,
      title,
      body: bodyText ?? body.body ?? null,
      createdBy: createdBy ?? null,
    },
  });

  // Bump lastContactedAt for contact-style activities
  if (["call", "email", "meeting", "sms", "whatsapp"].includes(type)) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { lastContactedAt: new Date() },
    });
  }

  return NextResponse.json(activity, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.activity.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
