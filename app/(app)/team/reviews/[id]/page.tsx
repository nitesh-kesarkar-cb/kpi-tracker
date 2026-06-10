import { notFound } from "next/navigation";
import { assertReviewManager } from "@/lib/auth-guards";
import { getReviewDetail, statusLabel, statusVariant } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ManagerReviewForm, type MgrMetricRow } from "@/components/kpi/manager-review-form";

export default async function TeamReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await assertReviewManager(id);
  const review = await getReviewDetail(id);
  if (!review) notFound();

  const editable = review.status !== "FINALIZED" && review.status !== "NOT_STARTED";

  const metrics: MgrMetricRow[] = review.metricScores.map((m) => ({
    id: m.id,
    categoryName: m.categoryName,
    categoryWeight: m.categoryWeight,
    metricText: m.metricText,
    target: m.target,
    selfScore: m.selfScore,
    selfComment: m.selfComment,
    managerScore: m.managerScore,
    managerComment: m.managerComment
  }));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {review.employee.firstName} {review.employee.lastName}
          </h1>
          <p className="text-muted-foreground">
            {review.employee.kpiRole?.name ?? review.employee.jobTitle} · {review.cycle.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Self: {review.overallSelfScore?.toFixed(0) ?? "—"}%</Badge>
          <Badge variant={statusVariant(review.status)}>{statusLabel(review.status)}</Badge>
        </div>
      </div>

      {review.employeeCompanyFeedback && (
        <Card>
          <CardContent className="py-4 text-sm">
            <p className="text-muted-foreground mb-1 text-xs font-medium">
              Employee feedback for the company
            </p>
            <p className="whitespace-pre-wrap">{review.employeeCompanyFeedback}</p>
          </CardContent>
        </Card>
      )}

      {review.status === "FINALIZED" && (
        <Card className="border-primary/40">
          <CardContent className="py-4 text-sm">
            This review is finalized. Final score:{" "}
            <b>{review.overallManagerScore?.toFixed(0) ?? "—"}%</b>
          </CardContent>
        </Card>
      )}

      <ManagerReviewForm
        reviewId={review.id}
        metrics={metrics}
        editable={editable}
        feedback={{
          managerFinalComments: review.managerFinalComments ?? "",
          improvementFeedback: review.improvementFeedback ?? "",
          finalReviewComments: review.finalReviewComments ?? ""
        }}
      />
    </div>
  );
}
