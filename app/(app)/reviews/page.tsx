import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { getEmployeeReviews, statusLabel, statusVariant } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardListIcon } from "lucide-react";

export const metadata = { title: "My Reviews — KPI Tracker" };

export default async function ReviewsPage() {
  const user = await requireUser();
  const reviews = await getEmployeeReviews(user.id);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Reviews</h1>
        <p className="text-muted-foreground">Your mid-year and year-end performance reviews.</p>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center">
            <ClipboardListIcon className="size-8" />
            <p>No reviews yet. They appear here once a review cycle is opened for you.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{r.cycle.name}</CardTitle>
                  <CardDescription>
                    {r.cycle.type === "MID_YEAR" ? "Mid-Year" : "Year-End"} · {r.cycle.year}
                    {r.manager ? ` · Manager: ${r.manager.firstName} ${r.manager.lastName}` : ""}
                  </CardDescription>
                </div>
                <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm">
                  {r.overallSelfScore != null && (
                    <span className="text-muted-foreground">
                      Self score: <b className="text-foreground">{r.overallSelfScore.toFixed(0)}%</b>
                    </span>
                  )}
                  {r.status === "FINALIZED" && r.overallManagerScore != null && (
                    <span className="text-muted-foreground ml-4">
                      Final score:{" "}
                      <b className="text-foreground">{r.overallManagerScore.toFixed(0)}%</b>
                    </span>
                  )}
                </div>
                <Button asChild size="sm">
                  <Link href={`/reviews/${r.id}`}>
                    {r.status === "FINALIZED" ? "View" : "Open"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
