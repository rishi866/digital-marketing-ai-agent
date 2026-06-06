import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const studies = await prisma.caseStudy.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(studies);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const study = await prisma.caseStudy.create({ data: body });
  return NextResponse.json(study, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.caseStudy.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
