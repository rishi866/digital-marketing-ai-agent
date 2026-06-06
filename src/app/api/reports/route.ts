import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [allLeads, staleLeads, dueFollowUps, weeklyOutreach, proposals] = await Promise.all([
    prisma.lead.findMany({ select: { industry: true, status: true, score: true, businessName: true, updatedAt: true } }),
    prisma.lead.findMany({
      where: { status: { in: ["new", "contacted"] }, updatedAt: { lt: sevenDaysAgo } },
      select: { businessName: true, industry: true, updatedAt: true },
      orderBy: { updatedAt: "asc" },
      take: 10,
    }),
    prisma.followUp.findMany({
      where: { status: "pending", scheduledAt: { lte: new Date() } },
      include: { lead: { select: { businessName: true } } },
      orderBy: { scheduledAt: "asc" },
      take: 10,
    }),
    prisma.outreachLog.count({ where: { sentAt: { gte: oneWeekAgo } } }),
    prisma.proposal.findMany({ select: { status: true } }),
  ]);

  // By industry
  const industryMap: Record<string, { count: number; converted: number }> = {};
  for (const lead of allLeads) {
    const ind = lead.industry ?? "Unknown";
    if (!industryMap[ind]) industryMap[ind] = { count: 0, converted: 0 };
    industryMap[ind].count++;
    if (lead.status === "converted") industryMap[ind].converted++;
  }
  const byIndustry = Object.entries(industryMap)
    .map(([industry, data]) => ({ industry, ...data }))
    .sort((a, b) => b.count - a.count);

  // Top leads by score
  const topLeads = [...allLeads]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(l => ({ businessName: l.businessName, score: l.score, status: l.status, industry: l.industry ?? undefined }));

  // Pipeline value (converted * avg deal + in-progress potential)
  const won = allLeads.filter(l => l.status === "converted").length;
  const inProgress = allLeads.filter(l => ["replied", "meeting", "proposal_sent"].includes(l.status)).length;
  const pipelineValue = (won * 15000) + (inProgress * 8000);

  return NextResponse.json({
    byIndustry,
    staleLeads,
    dueFollowUps,
    topLeads,
    weeklyOutreach,
    pipelineValue,
  });
}
