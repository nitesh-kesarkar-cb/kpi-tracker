import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { CyclesManager, type CycleRow } from "./cycles-manager";

export const metadata = { title: "Review Cycles — Admin" };

export default async function AdminCyclesPage() {
  await requireAdmin();
  const cycles = await db.reviewCycle.findMany({
    orderBy: [{ year: "desc" }, { type: "asc" }],
    include: { _count: { select: { reviews: true } } }
  });

  const rows: CycleRow[] = cycles.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    year: c.year,
    status: c.status,
    reviewCount: c._count.reviews
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Review Cycles</h1>
        <p className="text-muted-foreground">
          Create cycles, generate reviews for assigned employees, and open/close them.
        </p>
      </div>
      <CyclesManager cycles={rows} />
    </div>
  );
}
