import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";
import { getReviewDetail, statusLabel, statusVariant } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { ReviewReadonly } from "@/components/kpi/review-readonly";

export const metadata = { title: "Review — Admin" };

export default async function AdminReviewDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const review = await getReviewDetail(id);
  if (!review) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/admin/reviews?cycle=${review.cycleId}`}>
          <ArrowLeftIcon /> All reviews
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {review.employee.firstName} {review.employee.lastName}
          </h1>
          <p className="text-muted-foreground">
            {review.employee.kpiRole?.name ?? review.employee.jobTitle} · {review.cycle.name}
            {review.manager
              ? ` · Manager: ${review.manager.firstName} ${review.manager.lastName}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Self: {review.overallSelfScore?.toFixed(0) ?? "—"}%</Badge>
          <Badge variant="outline">Final: {review.overallManagerScore?.toFixed(0) ?? "—"}%</Badge>
          <Badge variant={statusVariant(review.status)}>{statusLabel(review.status)}</Badge>
        </div>
      </div>

      <ReviewReadonly
        metrics={review.metricScores}
        feedback={{
          employeeCompanyFeedback: review.employeeCompanyFeedback,
          finalReviewComments: review.finalReviewComments,
          improvementFeedback: review.improvementFeedback,
          managerFinalComments: review.managerFinalComments
        }}
      />
    </div>
  );
}
