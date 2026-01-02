"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { industry: true },
  });

  if (!user || !user.industry) {
    throw new Error("User not onboarded");
  }

  const industryInsight = await db.industryInsight.findUnique({
    where: { industry: user.industry },
  });

  // IMPORTANT:
  // No AI generation here anymore
  // This must already exist via onboarding or cron

  return industryInsight;
}
