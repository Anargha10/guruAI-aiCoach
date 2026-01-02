import { auth } from "@clerk/nextjs/server";
import { generateAIInsights } from "@/app/lib/ai/industry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { industry } = await req.json();

  const insights = await generateAIInsights(industry);
  return Response.json(insights);
}
