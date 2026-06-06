import { NextRequest, NextResponse } from "next/server";
import {
  generateSocialPost,
  generateBlogPost,
  generateAdCopy,
  generateProposal,
  generateContentCalendar,
} from "@/lib/agents/content-agent";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type } = body;

  if (type === "social_post") {
    const post = await generateSocialPost({
      industry: body.industry,
      platform: body.platform,
      topic: body.topic,
      tone: body.tone,
      includeHashtags: body.includeHashtags ?? true,
    });
    return NextResponse.json(post);
  }

  if (type === "blog") {
    const post = await generateBlogPost({
      topic: body.topic,
      industry: body.industry,
      wordCount: body.wordCount,
    });
    return NextResponse.json(post);
  }

  if (type === "ad_copy") {
    const copy = await generateAdCopy({
      businessType: body.businessType,
      offer: body.offer,
      platform: body.platform,
      targetAudience: body.targetAudience,
    });
    return NextResponse.json(copy);
  }

  if (type === "proposal") {
    const proposal = await generateProposal({
      clientName: body.clientName,
      businessType: body.businessType,
      painPoints: body.painPoints,
      budget: body.budget,
      agencyName: process.env.AGENCY_NAME,
    });
    return NextResponse.json({ proposal });
  }

  if (type === "calendar") {
    const calendar = await generateContentCalendar({
      industry: body.industry,
      platform: body.platform,
      weeks: body.weeks,
    });
    return NextResponse.json({ calendar });
  }

  return NextResponse.json({ error: "Unknown content type" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const where = type ? { type } : {};

  const content = await prisma.content.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(content);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.content.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
