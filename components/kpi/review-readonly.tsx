import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RatingInput } from "@/components/kpi/rating-input";

export type ReadonlyMetric = {
  id: string;
  categoryName: string;
  categoryWeight: number;
  metricText: string;
  target: string | null;
  selfScore: number | null;
  selfComment: string | null;
  managerScore: number | null;
  managerComment: string | null;
};

type Props = {
  metrics: ReadonlyMetric[];
  feedback: {
    employeeCompanyFeedback: string | null;
    finalReviewComments: string | null;
    improvementFeedback: string | null;
    managerFinalComments: string | null;
  };
};

/**
 * Read-only rendering of a full review — both the employee's self-assessment
 * and the manager's ratings/comments side by side. No inputs, no actions:
 * used by the admin org-wide viewer where super admins can look but not edit.
 */
export function ReviewReadonly({ metrics, feedback }: Props) {
  const grouped = new Map<string, { weight: number; items: ReadonlyMetric[] }>();
  for (const m of metrics) {
    const e = grouped.get(m.categoryName) ?? { weight: m.categoryWeight, items: [] };
    e.items.push(m);
    grouped.set(m.categoryName, e);
  }

  const hasFeedback =
    feedback.employeeCompanyFeedback ||
    feedback.finalReviewComments ||
    feedback.improvementFeedback ||
    feedback.managerFinalComments;

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([cat, { weight, items }]) => (
        <Card key={cat}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{cat}</CardTitle>
            <Badge variant="outline">{weight}%</Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            {items.map((m, i) => (
              <div key={m.id} className="space-y-2">
                {i > 0 && <Separator className="mb-4" />}
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{m.metricText}</p>
                  {m.target && <p className="text-muted-foreground text-xs">Target: {m.target}</p>}
                </div>

                <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Self</p>
                    <RatingInput value={m.selfScore} disabled />
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Manager</p>
                    <RatingInput value={m.managerScore} disabled />
                  </div>
                </div>

                {m.selfComment && (
                  <div className="bg-muted rounded-md p-3 text-sm">
                    <span className="text-muted-foreground text-xs font-medium">
                      Employee comment:{" "}
                    </span>
                    {m.selfComment}
                  </div>
                )}
                {m.managerComment && (
                  <div className="bg-muted rounded-md p-3 text-sm">
                    <span className="text-muted-foreground text-xs font-medium">
                      Manager comment:{" "}
                    </span>
                    {m.managerComment}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {hasFeedback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary &amp; feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {feedback.finalReviewComments && (
              <Field label="Final review comments" value={feedback.finalReviewComments} />
            )}
            {feedback.improvementFeedback && (
              <Field label="Areas for improvement" value={feedback.improvementFeedback} />
            )}
            {feedback.managerFinalComments && (
              <Field label="Additional manager comments" value={feedback.managerFinalComments} />
            )}
            {feedback.employeeCompanyFeedback && (
              <Field label="Employee feedback for the company" value={feedback.employeeCompanyFeedback} />
            )}
          </CardContent>
        </Card>
      )}
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
