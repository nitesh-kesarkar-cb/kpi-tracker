import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { statusLabel } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { ReportsCharts } from "./reports-charts";
import { CycleSelect } from "./cycle-select";

export const metadata = { title: "Reports — Admin" };

export default async function AdminReportsPage({
  searchParams
}: {
  searchParams: Promise<{ cycle?: string }>;
}) {
  await requireAdmin();
  const { cycle: cycleParam } = await searchParams;

  const cycles = await db.reviewCycle.findMany({ orderBy: [{ year: "desc" }, { type: "asc" }] });
  const cycle = cycleParam
    ? cycles.find((c) => c.id === cycleParam) ?? cycles[0]
    : cycles[0];

  if (!cycle) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground">No review cycles exist yet.</p>
      </div>
    );
  }

  const reviews = await db.review.findMany({
    where: { cycleId: cycle.id },
    include: { employee: { include: { kpiRole: true } } }
  });

  const total = reviews.length;
  const finalized = reviews.filter((r) => r.status === "FINALIZED");
  const completion = total > 0 ? (finalized.length / total) * 100 : 0;
  const avgFinal =
    finalized.length > 0
      ? finalized.reduce((s, r) => s + (r.overallManagerScore ?? 0), 0) / finalized.length
      : null;

  // avg final score by role
  const roleMap = new Map<string, number[]>();
  for (const r of finalized) {
    const role = r.employee.kpiRole?.name ?? "Unassigned";
    const arr = roleMap.get(role) ?? [];
    if (r.overallManagerScore != null) arr.push(r.overallManagerScore);
    roleMap.set(role, arr);
  }
  const byRole = Array.from(roleMap.entries())
    .filter(([, arr]) => arr.length > 0)
    .map(([role, arr]) => ({ role, score: arr.reduce((a, b) => a + b, 0) / arr.length }));

  const statusCounts = new Map<string, number>();
  for (const r of reviews) statusCounts.set(r.status, (statusCounts.get(r.status) ?? 0) + 1);
  const statusBreakdown = Array.from(statusCounts.entries()).map(([k, v]) => ({
    name: statusLabel(k),
    value: v
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-muted-foreground">Performance reporting for {cycle.name}.</p>
        </div>
        <div className="flex items-center gap-2">
          <CycleSelect cycles={cycles.map((c) => ({ id: c.id, name: c.name }))} current={cycle.id} />
          <Button asChild variant="outline">
            <Link href={`/admin/reports/export?cycle=${cycle.id}`}>
              <DownloadIcon /> Export CSV
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat title="Reviews" value={String(total)} desc="in this cycle" />
        <Stat title="Completion" value={`${completion.toFixed(0)}%`} desc={`${finalized.length} finalized`} />
        <Stat
          title="Avg final score"
          value={avgFinal != null ? `${avgFinal.toFixed(0)}%` : "—"}
          desc="across finalized reviews"
        />
      </div>

      <ReportsCharts byRole={byRole} statusBreakdown={statusBreakdown} />
    </div>
  );
}

function Stat({ title, value, desc }: { title: string; value: string; desc: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">{desc}</CardContent>
    </Card>
  );
}
