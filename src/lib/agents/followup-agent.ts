import { askClaude } from "../anthropic";
import { prisma } from "../db";

export async function generateFollowUpSequence(params: {
  leadId: string;
  businessName: string;
  industry?: string;
  previousMessage?: string;
  sequenceStep?: number;
}) {
  const {
    leadId,
    businessName,
    industry = "business",
    previousMessage = "",
    sequenceStep = 1,
  } = params;

  const stepGuide: Record<number, string> = {
    1: "First follow-up 3 days after initial email. Friendly bump, add one new value point.",
    2: "Second follow-up 1 week after. Share a relevant case study or result.",
    3: "Third follow-up 2 weeks after. Final check-in, soft breakup email that creates urgency.",
    4: "Re-engagement after 30 days. New angle, different value proposition.",
  };

  const prompt = `
Write a follow-up email for a digital marketing agency prospect.
Step: ${sequenceStep} - ${stepGuide[sequenceStep] ?? "General follow-up"}

Prospect: ${businessName} (${industry})
Previous message: ${previousMessage ? `"${previousMessage.slice(0, 200)}..."` : "Initial cold email"}

Requirements:
- Reference the previous contact naturally
- Add NEW value (don't repeat same points)
- Keep it under 100 words
- Step 3 should feel like a genuine breakup email

Respond ONLY with JSON: {"subject": "...", "body": "..."}`;

  const result = await askClaude(prompt);
  try {
    const cleaned = result.replace(/```json|```/g, "").trim();
    const draft = JSON.parse(cleaned) as { subject: string; body: string };

    const daysToAdd = [0, 3, 10, 20, 50][sequenceStep] ?? 7;
    const scheduledAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

    const followUp = await prisma.followUp.create({
      data: {
        leadId,
        message: `Subject: ${draft.subject}\n\n${draft.body}`,
        scheduledAt,
        status: "pending",
      },
    });

    return { ...draft, followUpId: followUp.id, scheduledAt };
  } catch {
    return null;
  }
}

export async function scheduleFullSequence(params: {
  leadId: string;
  businessName: string;
  industry?: string;
}) {
  const results = [];
  for (let step = 1; step <= 3; step++) {
    const result = await generateFollowUpSequence({
      ...params,
      sequenceStep: step,
    });
    if (result) results.push(result);
  }
  return results;
}

export async function getPendingFollowUps() {
  const now = new Date();
  return prisma.followUp.findMany({
    where: {
      status: "pending",
      scheduledAt: { lte: now },
    },
    include: { lead: true },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function analyzeConversation(params: {
  leadId: string;
  conversationThread: string;
}): Promise<string> {
  const prompt = `
Analyze this sales conversation and recommend the next best action.

Conversation:
${params.conversationThread}

Provide:
1. Lead temperature (hot/warm/cold)
2. Key objections raised
3. Buying signals detected
4. Recommended next step
5. A suggested response (if they replied)

Be specific and actionable.`;

  return askClaude(prompt);
}
