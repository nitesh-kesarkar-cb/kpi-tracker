import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { getOpenCycle, statusLabel, statusVariant } from "@/lib/queries";
import { getUserWithKpi } from "@/lib/queries";
import { rollupByCategory, scoreLabel } from "@/lib/scoring";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRightIcon, TargetIcon, UsersIcon } from "lucide-react";

export const metadata = { title: "Dashboard — KPI Tracker" };

export default async function DashboardPage() {
  const sessionUser = await requireUser();
  const [user, openCycle] = await Promise.all([getUserWithKpi(sessionUser.id), getOpenCycle()]);

  const currentReview = openCycle
    ? await db.review.findUnique({
        where: { cycleId_employeeId: { cycleId: openCycle.id, employeeId: sessionUser.id } },
        include: { metricScores: true }
      })
    : null;

  const rollups = currentReview
    ? rollupByCategory(
        currentReview.metricScores.map((m) => ({
          categoryName: m.categoryName,
          categoryWeight: m.categoryWeight,
          selfScore: m.selfScore,
          managerScore: m.managerScore
        }))
      )
    : [];

  const teamPending =
    sessionUser.accessRole === "MANAGER" || sessionUser.accessRole === "SUPER_ADMIN"
      ? await db.review.count({
          where: { managerId: sessionUser.id, status: "SELF_SUBMITTED" }
        })
      : 0;

  const firstName = sessionUser.name.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {firstName}</h1>
        <p className="text-muted-foreground">
          {user?.kpiRole?.name ?? user?.jobTitle ?? ""}
          {user?.manager ? ` · Manager: ${user.manager.firstName} ${user.manager.lastName}` : ""}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current cycle</CardDescription>
            <CardTitle className="text-lg">{openCycle ? openCycle.name : "None open"}</CardTitle>
          </CardHeader>
          <CardContent>
            {currentReview ? (
              <Badge variant={statusVariant(currentReview.status)}>
                {statusLabel(currentReview.status)}
              </Badge>
            ) : (
              <span className="text-muted-foreground text-sm">No review assigned</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Self score</CardDescription>
            <CardTitle className="text-2xl">
              {currentReview?.overallSelfScore != null
                ? `${currentReview.overallSelfScore.toFixed(0)}%`
                : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {scoreLabel(currentReview?.overallSelfScore ?? null)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Final score</CardDescription>
            <CardTitle className="text-2xl">
              {currentReview?.status === "FINALIZED" && currentReview.overallManagerScore != null
                ? `${currentReview.overallManagerScore.toFixed(0)}%`
                : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {currentReview?.status === "FINALIZED"
              ? scoreLabel(currentReview.overallManagerScore ?? null)
              : "Pending finalization"}
          </CardContent>
        </Card>
      </div>

      {currentReview && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Category breakdown</CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link href={`/reviews/${currentReview.id}`}>
                Open review <ArrowRightIcon />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {rollups.map((r) => {
              const shown = r.managerAvg ?? r.selfAvg;
              const pct = shown != null ? (shown / 5) * 100 : 0;
              return (
                <div key={r.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{r.name}</span>
                    <span className="text-muted-foreground">
                      {r.weight}% · {shown != null ? `${shown.toFixed(1)}/5` : "not rated"}
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <QuickLink
          href="/my-kpis"
          icon={<TargetIcon className="size-5" />}
          title="My KPIs"
          desc="See the KPIs and targets for your role."
        />
        {(sessionUser.accessRole === "MANAGER" || sessionUser.accessRole === "SUPER_ADMIN") && (
          <QuickLink
            href="/team"
            icon={<UsersIcon className="size-5" />}
            title="My Team"
            desc={
              teamPending > 0
                ? `${teamPending} review${teamPending === 1 ? "" : "s"} awaiting your rating`
                : "Review your direct reports."
            }
          />
        )}
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  desc
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/50 transition-colors">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="bg-muted rounded-md p-2">{icon}</div>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-muted-foreground text-sm">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
