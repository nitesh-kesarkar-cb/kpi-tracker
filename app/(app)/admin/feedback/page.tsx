import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquareTextIcon } from "lucide-react";

export const metadata = { title: "Feedback — Admin" };

export default async function AdminFeedbackPage() {
  await requireAdmin();
  const reviews = await db.review.findMany({
    where: {
      OR: [
        { employeeCompanyFeedback: { not: null } },
        { improvementFeedback: { not: null } },
        { finalReviewComments: { not: null } },
        { managerFinalComments: { not: null } }
      ]
    },
    orderBy: { updatedAt: "desc" },
    include: { employee: true, cycle: true }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Feedback</h1>
        <p className="text-muted-foreground">
          Employee feedback for the company and manager review feedback across all cycles.
        </p>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center">
            <MessageSquareTextIcon className="size-8" />
            <p>No feedback recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {r.employee.firstName} {r.employee.lastName}
                  </CardTitle>
                  <Badge variant="outline">{r.cycle.name}</Badge>
                </div>
                <CardDescription>{r.employee.jobTitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {r.employeeCompanyFeedback && (
                  <Block label="Employee → Company" value={r.employeeCompanyFeedback} accent />
                )}
                {r.finalReviewComments && (
                  <Block label="Final review comments" value={r.finalReviewComments} />
                )}
                {r.improvementFeedback && (
                  <Block label="Areas for improvement" value={r.improvementFeedback} />
                )}
                {r.managerFinalComments && (
                  <Block label="Manager comments" value={r.managerFinalComments} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Block({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={accent ? "bg-muted rounded-md p-3" : ""}>
      <p className="text-muted-foreground mb-1 text-xs font-medium">{label}</p>
      <p className="whitespace-pre-wrap">{value}</p>
    </div>
  );
}
