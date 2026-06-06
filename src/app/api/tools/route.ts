import { NextRequest, NextResponse } from "next/server";
import {
  handleObjection,
  analyzeReply,
  generateCallScript,
  generateWhatsAppPitch,
  generateCompetitorPitch,
} from "@/lib/agents/tools-agent";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  const agency = process.env.AGENCY_NAME;
  const sender = process.env.SENDER_NAME;

  if (action === "objection") {
    const result = await handleObjection({ ...body, agencyName: agency });
    return NextResponse.json(result);
  }

  if (action === "analyze_reply") {
    const result = await analyzeReply(body);
    return NextResponse.json(result);
  }

  if (action === "call_script") {
    const script = await generateCallScript({ ...body, agencyName: agency, senderName: sender });
    return NextResponse.json({ script });
  }

  if (action === "whatsapp") {
    const message = await generateWhatsAppPitch({ ...body, agencyName: agency, senderName: sender });
    return NextResponse.json({ message });
  }

  if (action === "competitor_pitch") {
    const result = await generateCompetitorPitch({ ...body, agencyName: agency, senderName: sender });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
