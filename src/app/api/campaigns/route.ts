import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateColdEmail } from "@/lib/agents/outreach-agent";

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    include: { _count: { select: { bulkEmails: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "create_campaign") {
    const campaign = await prisma.campaign.create({
      data: {
        name: body.name,
        targetNiche: body.niche,
        targetCity: body.city,
        totalLeads: body.leadIds?.length ?? 0,
      },
    });
    return NextResponse.json(campaign, { status: 201 });
  }

  if (body.action === "generate_emails") {
    const { campaignId, leadIds } = body;
    const leads = await prisma.lead.findMany({ where: { id: { in: leadIds } } });

    const emails = await Promise.all(
      leads.map(async (lead) => {
        const draft = await generateColdEmail({
          businessName: lead.businessName,
          industry: lead.industry ?? undefined,
          location: lead.location ?? undefined,
          notes: lead.notes ?? undefined,
          senderName: process.env.SENDER_NAME,
          agencyName: process.env.AGENCY_NAME,
        });

        return prisma.bulkEmail.create({
          data: {
            campaignId: campaignId ?? null,
            leadId: lead.id,
            subject: draft.subject,
            body: draft.body,
            status: "pending",
          },
        });
      })
    );

    if (campaignId) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { totalLeads: emails.length },
      });
    }

    return NextResponse.json({ count: emails.length, emails });
  }

  if (body.action === "approve_email") {
    const updated = await prisma.bulkEmail.update({
      where: { id: body.emailId },
      data: { status: "approved" },
    });
    return NextResponse.json(updated);
  }

  if (body.action === "get_emails") {
    const emails = await prisma.bulkEmail.findMany({
      where: { campaignId: body.campaignId },
      include: { lead: { select: { businessName: true, email: true, industry: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(emails);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  const { id, ...data } = await req.json();
  const updated = await prisma.bulkEmail.update({ where: { id }, data });
  return NextResponse.json(updated);
}
