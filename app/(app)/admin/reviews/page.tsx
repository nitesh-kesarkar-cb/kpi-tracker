import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { getAllReviews } from "@/lib/queries";
import { CycleSelect } from "../reports/cycle-select";
import { ReviewsTable, type ReviewRow } from "./reviews-table";

export const metadata = { title: "All Reviews — Admin" };

export default async function AdminReviewsPage({
  searchParams
}: {
  searchParams: Promise<{ cycle?: string }>;
}) {
  await requireAdmin();
  const { cycle: cycleParam } = await searchParams;

  const cycles = await db.reviewCycle.findMany({ orderBy: [{ year: "desc" }, { type: "asc" }] });
  const cycle = cycleParam ? (cycles.find((c) => c.id === cycleParam) ?? cycles[0]) : cycles[0];

  if (!cycle) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">All Reviews</h1>
        <p className="text-muted-foreground">No review cycles exist yet.</p>
      </div>
    );
  }

  const reviews = await getAllReviews(cycle.id);
  const rows: ReviewRow[] = reviews.map((r) => ({
    id: r.id,
    employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
    role: r.employee.kpiRole?.name ?? r.employee.jobTitle,
    managerName: r.manager ? `${r.manager.firstName} ${r.manager.lastName}` : "",
    status: r.status,
    selfScore: r.overallSelfScore,
    managerScore: r.overallManagerScore
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">All Reviews</h1>
          <p className="text-muted-foreground">
            Every self &amp; manager review for {cycle.name}. {reviews.length} total.
          </p>
        </div>
        <CycleSelect
          cycles={cycles.map((c) => ({ id: c.id, name: c.name }))}
          current={cycle.id}
          basePath="/admin/reviews"
        />
      </div>

      <ReviewsTable reviews={rows} />
    </div>
  );
}
