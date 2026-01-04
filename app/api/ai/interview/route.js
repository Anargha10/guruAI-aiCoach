import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.7,
    responseMimeType: "application/json",
  },
});

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

    const prompt = `
Generate EXACTLY 10 technical interview questions for a ${
      user.industry
    } professional${
      user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
    }.

Each question must be multiple choice with 4 options.

Return ONLY valid JSON in this exact structure:

{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.();

    if (!text) {
      throw new Error("Empty Gemini response");
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("Invalid JSON from Gemini:", text);
      return Response.json(
        { error: "AI returned invalid JSON" },
        { status: 500 }
      );
    }

    if (!Array.isArray(parsed.questions)) {
      return Response.json(
        { error: "Invalid AI response format" },
        { status: 500 }
      );
    }

    return Response.json({ questions: parsed.questions });
  } catch (error) {
    console.error("Interview API error:", error);
    return Response.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
