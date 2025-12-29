

'use server'

import { db } from "@/lib/prisma";
import {auth} from "@clerk/nextjs/server";
import { DemandLevel, MarketOutlook, recommendedSkills, salaryRanges } from "@prisma/client";
import { generateAIInsights } from "./dashboard";

export async function updateUser(data) {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const user = await db.user.findUnique({
        where: {
            clerkUserId: userId,
        }
    });
    if (!user) throw new Error("user not found");

    try {
        const result = await db.$transaction(
            async (tx) => {
                // find if industry exists
                let industryInsight = await tx.industryInsight.findUnique({
                    where: {
                        industry: data.industry,
                    }
                });
                // if no industry then create it with default values - will replace it with ai later
                if (!industryInsight) {
                  const insights = await generateAIInsights(data.industry)
                  console.log("ALL GOOD TILL HERE! ALL GOOD TILL HERE! ALL GOOD TILL HERE! ALL GOOD TILL HERE!")
                  industryInsight = await db.industryInsight.create({
                      data:{
                          industry: data.industry,
                          ...insights,
                          nextUpdate:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),

                      }
                  })

                   
                }
                // update the user
                const updatedUser= await tx.user.update({
                    where:{
                        id: user.id,
                    },
                    data:{
                        industry: data.industry,
                        experience: data.experience,
                        bio: data.bio,
                        skills: data.skills,
                    }
                })
                console.log('updated IGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG!')
                return{updateUser, industryInsight};
            },
            { timeout: 10000 }
        );

        return {success:true ,...result};
    } catch (error) {
        console.error("Error updating user and industry:", error.message);
        throw new Error("Failed to update profile"+ error.message);
    }
}


export async function getUserOnboardingStatus() {
     const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        industry: true,
      },
    });

    return {
      isOnboarded: !!user?.industry,
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    throw new Error("Failed to check onboarding status");
  }
}