import Link from "next/link";
import { requireManager } from "@/lib/auth-guards";
import { getTeamReviews, statusLabel, statusVariant } from "@/lib/queries";
import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { UsersIcon } from "lucide-react";

export const metadata = { title: "My Team — KPI Tracker" };

export default async function TeamPage() {
  const manager = await requireManager();
  const [reviews, reports] = await Promise.all([
    getTeamReviews(manager.id),
    db.user.findMany({
      where: { managerId: manager.id, isActive: true },
      include: { kpiRole: true },
      orderBy: { firstName: "asc" }
    })
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Team</h1>
        <p className="text-muted-foreground">
          {reports.length} direct report{reports.length === 1 ? "" : "s"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reviews</CardTitle>
          <CardDescription>Rate and finalize your reports&apos; reviews.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviews.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center">
              <UsersIcon className="size-8" />
              <p>No reviews to show yet.</p>
            </div>
          ) : (
            reviews.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback>
                      {getInitials(`${r.employee.firstName} ${r.employee.lastName}`)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {r.employee.firstName} {r.employee.lastName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {r.employee.kpiRole?.name ?? r.employee.jobTitle} · {r.cycle.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
                  <Button asChild size="sm" disabled={r.status === "NOT_STARTED"}>
                    <Link href={`/team/reviews/${r.id}`}>
                      {r.status === "FINALIZED" ? "View" : "Review"}
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
