import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/prisma";

export const runtime = "nodejs";
// 1. Critical: Increase Hobby timeout from 10s to 60s
export const maxDuration = 60; 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 2. Enable JSON Mode to prevent "Invalid JSON" errors
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
  },
});

async function generateQuestions({ industry, skills }) {
  const prompt = `Generate 5 technical interview questions for a ${industry} professional${

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
  // No regex needed with responseMimeType: "application/json"
  return JSON.parse(result.response.text()).questions;
}

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: { industry: true, skills: true },
    });

    if (!user?.industry) {
      return Response.json({ error: "User industry not set" }, { status: 400 });
    }

    // 3. Parallelize calls: Both finish in ~10s total instead of ~20s
    const [firstBatch, secondBatch] = await Promise.all([
      generateQuestions({ industry: user.industry, skills: user.skills }),
      generateQuestions({ industry: user.industry, skills: user.skills }),
    ]);

    return Response.json({
      questions: [...firstBatch, ...secondBatch],
    });
  } catch (error) {
    console.error("Interview API error:", error);
    return Response.json({ error: "Failed to generate quiz" }, { status: 500 });
  }
}