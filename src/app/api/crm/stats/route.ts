import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    total,
    newLeads,
    oldLeads,
    newThisWeek,
    statusGroups,
    sourceGroups,
    priorityGroups,
    openTasks,
    overdueTasks,
    upcomingFollowups,
    dealValueAgg,
    recentActivities,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "new" } }),
    prisma.lead.count({ where: { status: { not: "new" } } }),
    prisma.lead.count({ where: { createdAt: { gte: since7d } } }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["source"], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["priority"], _count: { _all: true } }),
    prisma.task.count({ where: { completedAt: null } }),
    prisma.task.count({ where: { completedAt: null, dueAt: { lt: new Date() } } }),
    prisma.lead.count({ where: { nextFollowUpAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.lead.aggregate({
      where: { status: "converted" },
      _sum: { dealValue: true },
    }),
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { lead: { select: { id: true, businessName: true } } },
    }),
  ]);

  // collect distinct tags
  const withTags = await prisma.lead.findMany({
    where: { tags: { not: null } },
    select: { tags: true },
  });
  const tagSet = new Set<string>();
  for (const r of withTags) {
    try {
      const arr = JSON.parse(r.tags ?? "[]") as string[];
      arr.forEach(t => { if (t) tagSet.add(t); });
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    total,
    newLeads,
    oldLeads,
    newThisWeek,
    since30d,
    statusGroups: statusGroups.map(g => ({ key: g.status, count: g._count._all })),
    sourceGroups: sourceGroups.map(g => ({ key: g.source ?? "manual", count: g._count._all })),
    priorityGroups: priorityGroups.map(g => ({ key: g.priority, count: g._count._all })),
    openTasks,
    overdueTasks,
    upcomingFollowups,
    pipelineValue: dealValueAgg._sum.dealValue ?? 0,
    distinctTags: Array.from(tagSet).sort(),
    recentActivities,
  });
}
