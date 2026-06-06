import { askClaude } from "../anthropic";
import { prisma } from "../db";

export const SERVICE_PACKAGES = {
  "Social Media Management": { basic: 8000, standard: 15000, premium: 25000 },
  "Website Design & SEO": { basic: 15000, standard: 30000, premium: 60000 },
  "Google & Meta Ads": { basic: 10000, standard: 20000, premium: 40000 },
  "Reputation Management": { basic: 5000, standard: 10000, premium: 18000 },
  "Local SEO & GMB": { basic: 6000, standard: 12000, premium: 20000 },
  "Content Creation": { basic: 5000, standard: 10000, premium: 18000 },
  "Email Marketing": { basic: 4000, standard: 8000, premium: 15000 },
  "Video Marketing": { basic: 12000, standard: 25000, premium: 50000 },
  "WhatsApp Marketing": { basic: 3000, standard: 6000, premium: 10000 },
};

export async function generateProposal(params: {
  leadId: string;
  selectedServices: string[];
  pricingTier: "basic" | "standard" | "premium";
  agencyName?: string;
}) {
  const lead = await prisma.lead.findUnique({ where: { id: params.leadId } });
  if (!lead) throw new Error("Lead not found");

  const caseStudies = await prisma.caseStudy.findMany({ take: 5 });
  const gaps = lead.gaps ? (JSON.parse(lead.gaps) as string[]) : [];

  const pricing = params.selectedServices.map((s) => {
    const pkg = SERVICE_PACKAGES[s as keyof typeof SERVICE_PACKAGES];
    const price = pkg ? pkg[params.pricingTier] : 10000;
    return { service: s, price };
  });

  const totalPrice = pricing.reduce((sum, p) => sum + p.price, 0);

  const prompt = `
Write a professional digital marketing proposal document.

CLIENT: ${lead.businessName}
Industry: ${lead.industry ?? "local business"}
Location: ${lead.location ?? "India"}
Rating: ${lead.rating ? `${lead.rating}/5 (${lead.reviewCount} reviews)` : "N/A"}
Website: ${lead.website ?? "None"}

IDENTIFIED PROBLEMS:
${gaps.map((g) => `- ${g}`).join("\n")}

PROPOSED SERVICES (${params.pricingTier} tier):
${pricing.map((p) => `- ${p.service}: ₹${p.price.toLocaleString("en-IN")}/month`).join("\n")}
TOTAL: ₹${totalPrice.toLocaleString("en-IN")}/month

AGENCY: ${params.agencyName ?? "Your Agency"}

${caseStudies.length > 0 ? `OUR RESULTS:\n${caseStudies.map((c) => `- ${c.clientType}: ${c.result} in ${c.duration ?? "3 months"}`).join("\n")}` : ""}

Write a complete proposal in markdown with these sections:
# Proposal for ${lead.businessName}

## Executive Summary (2 paragraphs — their situation + our solution)

## The Problem We See (bullet points — specific to their gaps)

## Our Solution (one section per service — what we'll do + expected outcome)

## Proven Results (use case studies if provided, else write plausible examples)

## Investment
(table with service, description, monthly price — formatted as markdown table)
**Total: ₹${totalPrice.toLocaleString("en-IN")}/month**

## What Happens Next
(3 simple steps to get started)

## About ${params.agencyName ?? "Our Agency"} (2-3 sentences)

Make it persuasive, specific to their industry, and professional. No generic filler.`;

  const body = await askClaude(prompt);

  const proposal = await prisma.proposal.create({
    data: {
      leadId: params.leadId,
      title: `Proposal for ${lead.businessName}`,
      services: JSON.stringify(params.selectedServices),
      body,
      pricingTier: params.pricingTier,
      status: "draft",
    },
  });

  return { ...proposal, pricing, totalPrice };
}
