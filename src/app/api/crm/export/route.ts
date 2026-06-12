import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = typeof val === "string" ? val : String(val);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 19).replace("T", " ");
}

function parseDate(s: string | null): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status") ?? "";
  const segment = searchParams.get("segment") ?? ""; // "new" | "old" | ""
  const source = searchParams.get("source") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const q = (searchParams.get("q") ?? "").trim();
  const dateFrom = parseDate(searchParams.get("dateFrom"));
  const dateTo = parseDate(searchParams.get("dateTo"));
  const idFrom = Number(searchParams.get("idFrom") ?? "");
  const idTo = Number(searchParams.get("idTo") ?? "");

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (source) where.source = source;
  if (priority) where.priority = priority;
  if (tag) where.tags = { contains: tag };
  if (q) {
    where.OR = [
      { businessName: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
      { industry: { contains: q } },
      { location: { contains: q } },
    ];
  }
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  // Segment: "new" = no outreach yet AND status is new; "old" = anything contacted+
  if (segment === "new") where.status = "new";
  else if (segment === "old") where.status = { not: "new" };

  // Fetch in createdAt order so "lead number" = row index + 1 (oldest first)
  let leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { outreachLogs: true, followUps: true, activities: true, tasks: true } } },
  });

  // Lead-number range filter (1-based, oldest first)
  if (Number.isFinite(idFrom) && idFrom > 0) leads = leads.slice(idFrom - 1);
  if (Number.isFinite(idTo) && idTo > 0) {
    const span = idTo - (Number.isFinite(idFrom) && idFrom > 0 ? idFrom - 1 : 0);
    if (span > 0) leads = leads.slice(0, span);
  }

  const headers = [
    "Lead #", "Business Name", "Industry", "Location", "Address",
    "Email", "Phone", "WhatsApp", "Website",
    "Instagram", "Facebook", "LinkedIn", "YouTube", "Twitter", "Google Maps",
    "Status", "Source", "Priority", "Score", "Deal Value", "Owner", "Tags",
    "Rating", "Reviews", "GMB Rank",
    "Website Score", "Social Score",
    "Outreach Sent", "Follow-ups", "Activities", "Tasks",
    "Last Contacted", "Next Follow-up", "Last Researched",
    "Created At", "Notes",
  ];

  const startIdx = (Number.isFinite(idFrom) && idFrom > 0) ? (idFrom - 1) : 0;
  const rows = leads.map((l, i) => {
    let tags = "";
    try { tags = (JSON.parse(l.tags ?? "[]") as string[]).join(", "); } catch { tags = l.tags ?? ""; }
    return [
      startIdx + i + 1,
      l.businessName,
      l.industry ?? "",
      l.location ?? "",
      l.address ?? "",
      l.email ?? "",
      l.phone ?? "",
      l.whatsapp ?? "",
      l.website ?? "",
      l.instagram ?? "",
      l.facebook ?? "",
      l.linkedin ?? "",
      l.youtube ?? "",
      l.twitter ?? "",
      l.gmb ?? "",
      l.status,
      l.source ?? "",
      l.priority ?? "",
      l.score,
      l.dealValue ?? 0,
      l.owner ?? "",
      tags,
      l.rating ?? "",
      l.reviewCount ?? "",
      l.gmbRank ?? "",
      l.websiteScore ?? "",
      l.socialScore ?? "",
      l._count.outreachLogs,
      l._count.followUps,
      l._count.activities,
      l._count.tasks,
      fmtDate(l.lastContactedAt),
      fmtDate(l.nextFollowUpAt),
      fmtDate(l.lastResearched),
      fmtDate(l.createdAt),
      l.notes ?? "",
    ];
  });

  // Excel-friendly UTF-8 BOM + CRLF
  const csv = "﻿" + [headers, ...rows].map(r => r.map(csvEscape).join(",")).join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);
  const parts: string[] = ["leads"];
  if (segment) parts.push(segment);
  if (status && status !== "all") parts.push(status);
  if (Number.isFinite(idFrom) && Number.isFinite(idTo)) parts.push(`${idFrom}-${idTo}`);
  parts.push(stamp);
  const filename = `${parts.join("_")}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
