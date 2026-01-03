import { db } from "@/lib/prisma";
import { inngest } from "./client";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", // Using 1.5-flash for stability
});

/**
 * Utility: Prompt Builder
 */
function buildPrompt(industry) {
  return `
    Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format:
    {
      "salaryRanges": [
        { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
      ],
      "growthRate": number,
      "demandLevel": "HIGH" | "MEDIUM" | "LOW",
      "topSkills": ["skill1", "skill2"],
      "marketOutlook": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
      "keyTrends": ["trend1", "trend2"],
      "recommendedSkills": ["skill1", "skill2"]
    }

    IMPORTANT: Return ONLY valid JSON. No markdown formatting.
  `;
}

/**
 * 1. Schedular Function (Cron)
 * Runs every Sunday. Fetches industries and triggers individual events.
 */
export const generateIndustryInsights = inngest.createFunction(
  { id: "generate-industry-insights-cron" },
  { cron: "0 0 * * 0" },
  async ({ step }) => {
    const industries = await step.run("Fetch industries", async () => {
      return db.industryInsight.findMany({
        select: { industry: true },
      });
    });

    if (industries.length === 0) return { message: "No industries to process" };

    // Fan-out: Create an event for every industry
    const events = industries.map((i) => ({
      name: "app/industry.update.requested",
      data: { industry: i.industry },
    }));

    // Send all events to Inngest to be processed independently
    await step.sendEvent("trigger-individual-updates", events);

    return { triggered: industries.length };
  }
);

/**
 * 2. Worker Function
 * Triggered by the event above. Handles one industry at a time.
 */
export const processSingleIndustry = inngest.createFunction(
  {
    id: "process-single-industry",
    retries: 3, // If one industry fails, Inngest retries just this one
    concurrency: {
      limit: 3, // Control how many AI calls happen at once to avoid Rate Limits
    },
  },
  { event: "app/industry.update.requested" },
  async ({ event, step }) => {
    const { industry } = event.data;

    // Step 1: Call AI
    const aiResponse = await step.run("get-ai-insights", async () => {
      const result = await model.generateContent(buildPrompt(industry));
      const text = result.response.text();
      return text.replace(/```(?:json)?\n?/g, "").trim();
    });

    // Step 2: Parse and Update DB
    await step.run("update-database", async () => {
      let insights;
      try {
        insights = JSON.parse(aiResponse);
      } catch (e) {
        throw new Error(`Invalid JSON returned for ${industry}`);
      }

      return await db.industryInsight.update({
        where: { industry },
        data: {
          ...insights,
          lastUpdated: new Date(),
          nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    });
  }
);