import { notFound } from "next/navigation";
import { assertReviewOwner } from "@/lib/auth-guards";
import { getReviewDetail, statusLabel, statusVariant } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SelfReviewForm, type MetricRow } from "@/components/kpi/self-review-form";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await assertReviewOwner(id);
  const review = await getReviewDetail(id);
  if (!review) notFound();

  const editable =
    review.status === "NOT_STARTED" ||
    review.status === "SELF_IN_PROGRESS" ||
    review.status === "SELF_SUBMITTED";
  const finalized = review.status === "FINALIZED";
  const resubmittable = review.status === "SELF_SUBMITTED";

  const metrics: MetricRow[] = review.metricScores.map((m) => ({
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
          <h1 className="text-2xl font-semibold">{review.cycle.name}</h1>
          <p className="text-muted-foreground">
            {review.employee.kpiRole?.name ?? "No KPI role assigned"} · {review.cycle.year}
          </p>
        </div>
        <Badge variant={statusVariant(review.status)}>{statusLabel(review.status)}</Badge>
      </div>

      {finalized && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">Final Review Summary</CardTitle>
            <CardDescription>
              Self score: {review.overallSelfScore?.toFixed(0) ?? "—"}% · Final score:{" "}
              <b>{review.overallManagerScore?.toFixed(0) ?? "—"}%</b>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {review.finalReviewComments && (
              <Field label="Final review comments" value={review.finalReviewComments} />
            )}
            {review.improvementFeedback && (
              <Field label="Areas for improvement" value={review.improvementFeedback} />
            )}
            {review.managerFinalComments && (
              <Field label="Manager comments" value={review.managerFinalComments} />
            )}
          </CardContent>
        </Card>
      )}

      {!editable && !finalized && (
        <Card>
          <CardContent className="text-muted-foreground py-4 text-sm">
            Your manager has started reviewing this. It can no longer be edited.
          </CardContent>
        </Card>
      )}

      {resubmittable && (
        <Card>
          <CardContent className="text-muted-foreground py-4 text-sm">
            Submitted to your manager. You can still update ratings and comments until your manager
            begins their review.
          </CardContent>
        </Card>
      )}

      <SelfReviewForm
        reviewId={review.id}
        metrics={metrics}
        companyFeedback={review.employeeCompanyFeedback}
        editable={editable}
        resubmit={resubmittable}
        showManager={finalized}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="whitespace-pre-wrap">{value}</p>
    </div>
  );
}
