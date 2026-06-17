import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface BulkRequest {
  ids: string[];
  action: "setStatus" | "setPriority" | "setOwner" | "setSource" | "addTags" | "removeTags" | "setDealValue" | "setFollowUp" | "delete";
  value?: string | number | string[] | null;
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(String).map(s => s.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as BulkRequest;
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }
  const ids = body.ids.slice(0, 1000);

  switch (body.action) {
    case "setStatus": {
      const result = await prisma.lead.updateMany({
        where: { id: { in: ids } },
        data: { status: String(body.value) },
      });
      return NextResponse.json({ updated: result.count });
    }
    case "setPriority": {
      const result = await prisma.lead.updateMany({
        where: { id: { in: ids } },
        data: { priority: String(body.value) },
      });
      return NextResponse.json({ updated: result.count });
    }
    case "setOwner": {
      const result = await prisma.lead.updateMany({
        where: { id: { in: ids } },
        data: { owner: body.value ? String(body.value) : null },
      });
      return NextResponse.json({ updated: result.count });
    }
    case "setSource": {
      const result = await prisma.lead.updateMany({
        where: { id: { in: ids } },
        data: { source: String(body.value) },
      });
      return NextResponse.json({ updated: result.count });
    }
    case "setDealValue": {
      const result = await prisma.lead.updateMany({
        where: { id: { in: ids } },
        data: { dealValue: Math.max(0, Number(body.value) || 0) },
      });
      return NextResponse.json({ updated: result.count });
    }
    case "setFollowUp": {
      const dt = body.value ? new Date(String(body.value)) : null;
      const result = await prisma.lead.updateMany({
        where: { id: { in: ids } },
        data: { nextFollowUpAt: dt },
      });
      return NextResponse.json({ updated: result.count });
    }
    case "addTags":
    case "removeTags": {
      const tagsToChange = Array.isArray(body.value)
        ? body.value.map(String).map(s => s.trim()).filter(Boolean)
        : String(body.value ?? "").split(",").map(s => s.trim()).filter(Boolean);
      if (tagsToChange.length === 0) {
        return NextResponse.json({ error: "tags required" }, { status: 400 });
      }
      const leads = await prisma.lead.findMany({
        where: { id: { in: ids } },
        select: { id: true, tags: true },
      });
      let updated = 0;
      for (const l of leads) {
        const existing = new Set(parseTags(l.tags));
        if (body.action === "addTags") tagsToChange.forEach(t => existing.add(t));
        else tagsToChange.forEach(t => existing.delete(t));
        await prisma.lead.update({
          where: { id: l.id },
          data: { tags: JSON.stringify(Array.from(existing)) },
        });
        updated++;
      }
      return NextResponse.json({ updated });
    }
    case "delete": {
      const result = await prisma.lead.deleteMany({ where: { id: { in: ids } } });
      return NextResponse.json({ deleted: result.count });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
