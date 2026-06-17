import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const now = new Date();
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const endOfThisWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [overdueTasks, dueTodayTasks, dueFollowUps, dueFollowupLeads, staleHot] = await Promise.all([
    prisma.task.findMany({
      where: { completedAt: null, dueAt: { lt: now } },
      orderBy: { dueAt: "asc" },
      include: { lead: { select: { id: true, businessName: true } } },
      take: 15,
    }),
    prisma.task.findMany({
      where: { completedAt: null, dueAt: { gte: now, lte: endOfToday } },
      orderBy: { dueAt: "asc" },
      include: { lead: { select: { id: true, businessName: true } } },
      take: 15,
    }),
    prisma.followUp.findMany({
      where: { status: "pending", scheduledAt: { lte: endOfToday } },
      orderBy: { scheduledAt: "asc" },
      include: { lead: { select: { id: true, businessName: true } } },
      take: 15,
    }),
    prisma.lead.findMany({
      where: {
        nextFollowUpAt: { gte: now, lte: endOfThisWeek },
      },
      orderBy: { nextFollowUpAt: "asc" },
      select: { id: true, businessName: true, status: true, priority: true, nextFollowUpAt: true, dealValue: true },
      take: 15,
    }),
    prisma.lead.findMany({
      where: {
        status: { in: ["contacted", "replied", "meeting", "proposal_sent"] },
        OR: [
          { lastContactedAt: null },
          { lastContactedAt: { lt: since14d } },
        ],
      },
      orderBy: [{ priority: "desc" }, { lastContactedAt: "asc" }],
      select: { id: true, businessName: true, status: true, lastContactedAt: true, dealValue: true },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    overdueTasks,
    dueTodayTasks,
    dueFollowUps,
    dueFollowupLeads,
    staleHot,
  });
}
