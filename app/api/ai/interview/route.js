import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔹 Fetch user profile directly
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        industry: true,
        skills: true,
      },
    });

    if (!user?.industry) {
      return Response.json(
        { error: "User industry not set" },
        { status: 400 }
      );
    }

    const prompt = `
      Generate 10 technical interview questions for a ${
        user.industry
      } professional${
      user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
    }.

      Each question should be multiple choice with 4 options.

      Return ONLY valid JSON:
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
    const text = result.response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    let quiz;
    try {
      quiz = JSON.parse(cleanedText);
    } catch (e) {
      console.error("AI JSON parse error:", cleanedText);
      return Response.json(
        { error: "Invalid AI response format" },
        { status: 500 }
      );
    }

    return Response.json({ questions: quiz.questions });
  } catch (error) {
    console.error("Interview API error:", error);
    return Response.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
