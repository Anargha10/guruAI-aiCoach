import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.5,
    responseMimeType: "application/json",
  },
});

// Strong JSON parser that prevents crashing
function safeJSON(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("JSON parse failed. Raw text:", text);
    return null;
  }
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

    const prompt = `
Generate EXACTLY 10 technical interview questions for a ${
      user.industry
    } professional${
      user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
    }.

Each question must be multiple choice with 4 options.

Return ONLY valid JSON in this EXACT format:

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

    const rawText = result?.response?.text?.();

    if (!rawText) {
      console.error("Gemini empty response:", result);
      return Response.json(
        { error: "AI returned empty response. Try again." },
        { status: 503 }
      );
    }

    // First parse attempt
    let parsed = safeJSON(rawText);

    // If Gemini still returned text instead of JSON
    if (!parsed?.questions) {
      console.error("Invalid AI JSON:", rawText);

      return Response.json(
        {
          error: "AI_JSON_ERROR",
          message:
            "AI returned invalid JSON. Please try again in a few seconds.",
        },
        { status: 503 }
      );
    }

    return Response.json({ questions: parsed.questions });
  } catch (error) {
    console.error("Interview API error:", error);
    return Response.json(
      { error: "Failed to generate quiz because our AI engine is busy. Try again a few mins later" },
      { status: 500 }
    );
  }
}
