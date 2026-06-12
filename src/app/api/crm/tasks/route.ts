import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  const open = searchParams.get("open");

  if (open === "true") {
    const tasks = await prisma.task.findMany({
      where: { completedAt: null },
      include: { lead: { select: { businessName: true } } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
    return NextResponse.json({ tasks });
  }

  if (!leadId) return NextResponse.json({ error: "leadId or open=true required" }, { status: 400 });

  const tasks = await prisma.task.findMany({
    where: { leadId },
    orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { leadId, title, description, dueAt, priority } = body;
  if (!leadId || !title) {
    return NextResponse.json({ error: "leadId and title required" }, { status: 400 });
  }
  const task = await prisma.task.create({
    data: {
      leadId,
      title,
      description: description ?? null,
      dueAt: dueAt ? new Date(dueAt) : null,
      priority: priority ?? "medium",
    },
  });
  return NextResponse.json(task, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (data.toggleComplete) {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
    const updated = await prisma.task.update({
      where: { id },
      data: { completedAt: existing.completedAt ? null : new Date() },
    });
    return NextResponse.json(updated);
  }

  if (data.dueAt) data.dueAt = new Date(data.dueAt);
  const updated = await prisma.task.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
