import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function generateQuestions({ industry, skills, offset }) {
  const prompt = `
Generate 5 technical interview questions for a ${industry} professional${
    skills?.length ? ` with expertise in ${skills.join(", ")}` : ""
}.

These should be DIFFERENT from previous questions.

Return ONLY valid JSON:
{
  "questions": [
    {
      "question": "string",
      "options": ["string","string","string","string"],
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```(?:json)?\n?/g, "").trim();
  return JSON.parse(cleaned).questions;
}

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: { industry: true, skills: true },
    });

    if (!user?.industry) {
      return Response.json(
        { error: "User industry not set" },
        { status: 400 }
      );
    }

    // 🔹 Two fast calls instead of one slow call
    const firstBatch = await generateQuestions({
      industry: user.industry,
      skills: user.skills,
      offset: 0,
    });

    const secondBatch = await generateQuestions({
      industry: user.industry,
      skills: user.skills,
      offset: 5,
    });

    return Response.json({
      questions: [...firstBatch, ...secondBatch],
    });
  } catch (error) {
    console.error("Interview API error:", error);
    return Response.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
