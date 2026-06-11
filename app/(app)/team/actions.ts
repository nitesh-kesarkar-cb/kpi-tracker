"use server";

import { revalidatePath } from "next/cache";
import { assertReviewManager } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { rollupByCategory, overallPercent } from "@/lib/scoring";

export type ManagerScoreInput = {
  metricScoreId: string;
  managerScore: number | null;
  managerComment: string;
};

export type ManagerReviewFeedback = {
  managerFinalComments: string;
  improvementFeedback: string;
  finalReviewComments: string;
};

export async function saveManagerReview(
  reviewId: string,
  scores: ManagerScoreInput[],
  feedback: ManagerReviewFeedback,
  finalize: boolean
) {
  const actor = await assertReviewManager(reviewId);

  const review = await db.review.findUnique({ where: { id: reviewId } });
  if (!review) return { ok: false, error: "Review not found" };
  if (review.status === "FINALIZED") {
    return { ok: false, error: "This review is already finalized." };
  }

  await db.$transaction(
    scores.map((s) =>
      db.metricScore.update({
        where: { id: s.metricScoreId },
        data: {
          managerScore: s.managerScore ?? null,
          managerComment: s.managerComment || null
        }
      })
    )
  );

  if (finalize) {
    const unscored = await db.metricScore.count({
      where: { reviewId, managerScore: null }
    });
    if (unscored > 0) {
      return {
        ok: false,
        error: `Please rate all metrics before finalizing (${unscored} left).`
      };
    }
  }

  const all = await db.metricScore.findMany({ where: { reviewId } });
  const rollups = rollupByCategory(
    all.map((s) => ({
      categoryName: s.categoryName,
      categoryWeight: s.categoryWeight,
      selfScore: s.selfScore,
      managerScore: s.managerScore
    }))
  );
  const overallManagerScore = overallPercent(rollups, "manager");

  await db.review.update({
    where: { id: reviewId },
    data: {
      managerFinalComments: feedback.managerFinalComments || null,
      improvementFeedback: feedback.improvementFeedback || null,
      finalReviewComments: feedback.finalReviewComments || null,
      overallManagerScore,
      status: finalize ? "FINALIZED" : "MANAGER_IN_PROGRESS",
      finalizedAt: finalize ? new Date() : review.finalizedAt
    }
  });

  await logAudit({
    actor,
    category: "REVIEW",
    action: finalize ? "review.manager_finalize" : "review.manager_save",
    entityType: "Review",
    entityId: reviewId,
    summary: finalize
      ? `Finalized review for employee (overall ${overallManagerScore ?? "—"}%)`
      : `Saved manager review draft`,
    metadata: { overallManagerScore, employeeId: review.employeeId }
  });

  revalidatePath(`/team/reviews/${reviewId}`);
  revalidatePath("/team");
  return { ok: true as const, finalized: finalize };
}
