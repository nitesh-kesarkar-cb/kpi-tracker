"use server";

import { revalidatePath } from "next/cache";
import { assertReviewOwner } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { rollupByCategory, overallPercent } from "@/lib/scoring";

export type SelfScoreInput = {
  metricScoreId: string;
  selfScore: number | null;
  selfComment: string;
};

async function recomputeSelf(reviewId: string) {
  const scores = await db.metricScore.findMany({ where: { reviewId } });
  const rollups = rollupByCategory(
    scores.map((s) => ({
      categoryName: s.categoryName,
      categoryWeight: s.categoryWeight,
      selfScore: s.selfScore,
      managerScore: s.managerScore
    }))
  );
  return overallPercent(rollups, "self");
}

export async function saveSelfReview(
  reviewId: string,
  scores: SelfScoreInput[],
  companyFeedback: string,
  submit: boolean
) {
  const actor = await assertReviewOwner(reviewId);

  const review = await db.review.findUnique({ where: { id: reviewId } });
  if (!review) return { ok: false, error: "Review not found" };
  if (review.status === "MANAGER_IN_PROGRESS" || review.status === "FINALIZED") {
    return {
      ok: false,
      error: "Your manager has started reviewing this; it can no longer be edited."
    };
  }

  if (submit) {
    // require every metric to be scored AND commented before submitting
    const missingRating = scores.filter((s) => s.selfScore == null).length;
    if (missingRating > 0) {
      return { ok: false, error: `Please rate all metrics before submitting (${missingRating} left).` };
    }
    const missingComment = scores.filter((s) => !s.selfComment?.trim()).length;
    if (missingComment > 0) {
      return {
        ok: false,
        error: `Please add a comment for every metric before submitting (${missingComment} left).`
      };
    }
  }

  await db.$transaction(
    scores.map((s) =>
      db.metricScore.update({
        where: { id: s.metricScoreId },
        data: {
          selfScore: s.selfScore ?? null,
          selfComment: s.selfComment?.trim() || null
        }
      })
    )
  );

  const overallSelfScore = await recomputeSelf(reviewId);

  await db.review.update({
    where: { id: reviewId },
    data: {
      employeeCompanyFeedback: companyFeedback || null,
      overallSelfScore,
      status: submit ? "SELF_SUBMITTED" : "SELF_IN_PROGRESS",
      submittedAt: submit ? new Date() : review.submittedAt
    }
  });

  await logAudit({
    actor,
    category: "REVIEW",
    action: submit ? "review.self_submit" : "review.self_save",
    entityType: "Review",
    entityId: reviewId,
    summary: submit
      ? `Submitted self-review (overall ${overallSelfScore ?? "—"}%)`
      : `Saved self-review draft`,
    metadata: { overallSelfScore, metricsScored: scores.length }
  });

  revalidatePath(`/reviews/${reviewId}`);
  revalidatePath("/reviews");
  revalidatePath("/dashboard");
  return { ok: true as const, submitted: submit };
}
