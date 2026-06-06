import { NextRequest, NextResponse } from "next/server";
import { generateWeaknessPitch } from "@/lib/agents/pitch-agent";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { leadId, selectedGap, channel } = body;
  if (!leadId || !selectedGap) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const result = await generateWeaknessPitch({
    leadId,
    selectedGap,
    channel: channel ?? "email",
    senderName: process.env.SENDER_NAME,
    agencyName: process.env.AGENCY_NAME,
  });

  return NextResponse.json(result);
}
