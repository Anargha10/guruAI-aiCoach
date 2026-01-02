"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

/**
 * Updates user profile data during onboarding.
 * NOTE: No AI logic here. Industry insights are generated elsewhere.
 */
export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  // Ensure IndustryInsight record exists (NO AI GENERATION)
  let industryInsight = await db.industryInsight.findUnique({
    where: { industry: data.industry },
  });

  if (!industryInsight) {
    industryInsight = await db.industryInsight.create({
      data: {
        industry: data.industry,
        salaryRanges: [],
        topSkills: [],
        keyTrends: [],
        recommendedSkills: [],
        growthRate: 0,
        demandLevel: "MEDIUM",
        marketOutlook: "NEUTRAL",
        nextUpdate: new Date(),
      },
    });
  }

  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: {
      industry: data.industry,
      experience: data.experience,
      bio: data.bio,
      skills: data.skills,
    },
  });

  return { success: true, user: updatedUser };
}

/**
 * Used by dashboard routing logic.
 */
export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { industry: true },
  });

  return {
    isOnboarded: Boolean(user?.industry),
  };
}
