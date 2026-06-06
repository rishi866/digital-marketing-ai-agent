import { askClaude } from "../anthropic";
import { prisma } from "../db";

type ContentType = "social_post" | "blog" | "ad_copy" | "email_template" | "proposal";
type Platform = "instagram" | "facebook" | "linkedin" | "google" | "twitter";

export async function generateSocialPost(params: {
  industry: string;
  platform: Platform;
  topic?: string;
  tone?: string;
  includeHashtags?: boolean;
}) {
  const {
    industry,
    platform,
    topic = "digital marketing tips",
    tone = "professional yet friendly",
    includeHashtags = true,
  } = params;

  const platformGuide: Record<Platform, string> = {
    instagram: "visual, emoji-rich, storytelling, 150-200 words, strong hook",
    facebook: "conversational, shareable, 100-150 words, ask a question",
    linkedin: "professional, value-driven, 200-300 words, thought leadership",
    google: "concise, keyword-rich, 90 characters max for ads",
    twitter: "punchy, under 280 chars, trending angle",
  };

  const prompt = `
Write a ${platform} post for a digital marketing agency serving ${industry} businesses.
Topic: ${topic}
Tone: ${tone}
Platform style: ${platformGuide[platform]}
${includeHashtags ? "Include 5-8 relevant hashtags at the end." : "No hashtags."}

Make it engaging, valuable, and subtly position the agency as an expert.
Respond with only the post content.`;

  const body = await askClaude(prompt);

  return prisma.content.create({
    data: {
      type: "social_post",
      platform,
      body,
      industry,
      tags: topic,
    },
  });
}

export async function generateBlogPost(params: {
  topic: string;
  industry: string;
  wordCount?: number;
}) {
  const { topic, industry, wordCount = 800 } = params;

  const prompt = `
Write a ${wordCount}-word blog post for a digital marketing agency blog.
Topic: "${topic}"
Target audience: ${industry} business owners who are not marketing experts
Tone: Educational, helpful, subtly demonstrates agency expertise

Structure:
- Catchy H1 title
- Brief intro (2-3 sentences)
- 3-4 main sections with H2 headings
- Practical actionable tips
- CTA at the end to book a free consultation

Respond with the full blog post in markdown format.`;

  const result = await askClaude(prompt);
  const titleMatch = result.match(/^#\s+(.+)/m);

  return prisma.content.create({
    data: {
      type: "blog",
      title: titleMatch ? titleMatch[1] : topic,
      body: result,
      industry,
      tags: topic,
    },
  });
}

export async function generateAdCopy(params: {
  businessType: string;
  offer: string;
  platform: "google" | "facebook" | "instagram";
  targetAudience?: string;
}) {
  const prompt = `
Write high-converting ad copy for a ${params.platform} ad.
Business type: ${params.businessType}
Offer: ${params.offer}
Target audience: ${params.targetAudience ?? "local business owners"}

Provide:
1. Headline (max 30 chars for Google, 40 for Meta)
2. Primary text (125 chars for Meta, 90 for Google description)
3. CTA button text
4. A/B variation of the headline

Format as JSON: {"headline": "", "primaryText": "", "cta": "", "headlineB": ""}`;

  const result = await askClaude(prompt);
  try {
    const cleaned = result.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    await prisma.content.create({
      data: {
        type: "ad_copy",
        platform: params.platform,
        title: parsed.headline,
        body: JSON.stringify(parsed, null, 2),
        industry: params.businessType,
        tags: params.offer,
      },
    });

    return parsed;
  } catch {
    return { headline: "", primaryText: result, cta: "Learn More", headlineB: "" };
  }
}

export async function generateProposal(params: {
  clientName: string;
  businessType: string;
  painPoints?: string;
  budget?: string;
  agencyName?: string;
}) {
  const {
    clientName,
    businessType,
    painPoints = "low online visibility, inconsistent leads",
    budget = "flexible",
    agencyName = "Your Agency",
  } = params;

  const prompt = `
Write a professional digital marketing proposal for:
Client: ${clientName} (${businessType})
Pain points: ${painPoints}
Budget: ${budget}
Agency: ${agencyName}

Include:
1. Executive Summary
2. Understanding of Their Challenges
3. Our Recommended Solution (3 specific services with brief description)
4. Expected Results / KPIs (realistic)
5. Investment (use "starting from $X/month" format)
6. Next Steps

Make it persuasive, specific to their industry, and professional.
Format in markdown.`;

  const result = await askClaude(prompt);

  await prisma.content.create({
    data: {
      type: "proposal",
      title: `Proposal for ${clientName}`,
      body: result,
      industry: businessType,
      tags: "proposal",
    },
  });

  return result;
}

export async function generateContentCalendar(params: {
  industry: string;
  platform: Platform;
  weeks?: number;
}) {
  const { industry, platform, weeks = 4 } = params;

  const prompt = `
Create a ${weeks}-week social media content calendar for a ${industry} business on ${platform}.

For each week, provide 5 post ideas (Mon-Fri) with:
- Day
- Content type (tip, story, case study, question, promotion)
- Post topic/hook (1 sentence)

Format as a simple list:
Week 1
Mon - [type]: [topic]
...

Keep topics specific to ${industry} and varied.`;

  return askClaude(prompt);
}
