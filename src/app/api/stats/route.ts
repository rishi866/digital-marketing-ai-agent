import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [
    totalLeads,
    contactedLeads,
    repliedLeads,
    convertedLeads,
    totalOutreach,
    pendingFollowUps,
    contentPieces,
    recentLeads,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "contacted" } }),
    prisma.lead.count({ where: { status: "replied" } }),
    prisma.lead.count({ where: { status: "converted" } }),
    prisma.outreachLog.count(),
    prisma.followUp.count({ where: { status: "pending" } }),
    prisma.content.count(),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { businessName: true, status: true, score: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    leads: { total: totalLeads, contacted: contactedLeads, replied: repliedLeads, converted: convertedLeads },
    outreach: { total: totalOutreach },
    followUps: { pending: pendingFollowUps },
    content: { total: contentPieces },
    recentLeads,
    conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0",
    responseRate: totalOutreach > 0 ? ((repliedLeads / totalOutreach) * 100).toFixed(1) : "0",
  });
}
