import { db } from "@/lib/prisma";
import { inngest } from "./client";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini setup
 * IMPORTANT: Use non-deprecated model for cron reliability
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

/**
 * Utility: build prompt (kept identical logically)
 */
function buildPrompt(industry) {
  return `
    Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
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

    IMPORTANT:
    - Return ONLY valid JSON
    - No markdown
    - Include at least 5 roles, skills, and trends
    - Growth rate must be a percentage
  `;
}

/**
 * Weekly cron job
 * Runs every Sunday at 00:00 UTC
 */
export const generateIndustryInsights = inngest.createFunction(
  {
    name: "Generate Industry Insights (Weekly) v2",
    retries: 3, // controlled retries
    concurrency: { limit: 1 }, // prevent overlapping runs
  },
  { cron: "0 0 * * 0" },
  async ({ step }) => {
    /**
     * Step 1: Fetch industries (bounded for safety)
     */
    const industries = await step.run("Fetch industries", async () => {
      return db.industryInsight.findMany({
        select: { industry: true },
      });
    });

    /**
     * Step 2: Process industries one-by-one
     * IMPORTANT:
     * - Each industry is isolated
     * - Failures do NOT break the cron
     */
    for (const { industry } of industries) {
      await step.run(`Update insights for ${industry}`, async () => {
        let insights = null;

        try {
          /**
           * AI call wrapped for observability
           */
          const res = await step.ai.wrap(
            "gemini",
            async (prompt) => model.generateContent(prompt),
            buildPrompt(industry)
          );

          const text =
            res?.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

          const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

          try {
            insights = JSON.parse(cleanedText);
          } catch (jsonError) {
            console.error(
              `[Industry Insights] Invalid JSON for ${industry}`,
              jsonError
            );
            return; // isolate failure
          }

          if (!insights || typeof insights !== "object") {
            console.error(
              `[Industry Insights] Empty/invalid insights for ${industry}`
            );
            return;
          }

          /**
           * Update DB
           */
          await db.industryInsight.update({
            where: { industry },
            data: {
              ...insights,
              lastUpdated: new Date(),
              nextUpdate: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
              ),
            },
          });
        } catch (err) {
          /**
           * DO NOT throw
           * Prevent cron poisoning
           */
          console.error(
            `[Industry Insights] Failed for ${industry}`,
            err
          );
          return;
        }
      });
    }

    return { success: true };
  }
);
