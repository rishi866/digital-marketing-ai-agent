import { NextRequest, NextResponse } from "next/server";
import { getFieldBrief } from "@/lib/agents/field-agent";

export async function POST(req: NextRequest) {
  try {
    const { businessName, location } = await req.json();
    if (!businessName?.trim()) {
      return NextResponse.json({ error: "Business name required" }, { status: 400 });
    }
    const brief = await getFieldBrief({
      businessName: businessName.trim(),
      location: (location ?? "India").trim(),
      agencyName: process.env.AGENCY_NAME,
    });
    return NextResponse.json(brief);
  } catch (err) {
    console.error("field-lookup error:", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
