"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, SaveIcon, SendIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RatingInput } from "@/components/kpi/rating-input";
import { saveSelfReview, type SelfScoreInput } from "@/app/(app)/reviews/actions";

export type MetricRow = {
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
  reviewId: string;
  metrics: MetricRow[];
  companyFeedback: string | null;
  editable: boolean;
  resubmit?: boolean;
  showManager: boolean;
};

export function SelfReviewForm({
  reviewId,
  metrics,
  companyFeedback,
  editable,
  resubmit,
  showManager
}: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<MetricRow[]>(metrics);
  const [feedback, setFeedback] = useState(companyFeedback ?? "");
  const [pending, setPending] = useState<null | "save" | "submit">(null);

  const grouped = useMemo(() => {
    const map = new Map<string, { weight: number; items: MetricRow[] }>();
    for (const m of rows) {
      const e = map.get(m.categoryName) ?? { weight: m.categoryWeight, items: [] };
      e.items.push(m);
      map.set(m.categoryName, e);
    }
    return Array.from(map.entries());
  }, [rows]);

  function update(id: string, patch: Partial<MetricRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function persist(submit: boolean) {
    if (submit) {
      const missingRating = rows.filter((r) => r.selfScore == null).length;
      if (missingRating > 0) {
        toast.error(`Please rate all metrics before submitting (${missingRating} left).`);
        return;
      }
      const missingComment = rows.filter((r) => !r.selfComment?.trim()).length;
      if (missingComment > 0) {
        toast.error(`Please add a comment for every metric before submitting (${missingComment} left).`);
        return;
      }
    }
    setPending(submit ? "submit" : "save");
    const payload: SelfScoreInput[] = rows.map((r) => ({
      metricScoreId: r.id,
      selfScore: r.selfScore,
      selfComment: r.selfComment ?? ""
    }));
    const res = await saveSelfReview(reviewId, payload, feedback, submit);
    setPending(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(submit ? "Review submitted to your manager" : "Draft saved");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {grouped.map(([cat, { weight, items }]) => (
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
                  {m.target && (
                    <p className="text-muted-foreground text-xs">Target: {m.target}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Self rating</p>
                    <RatingInput
                      value={m.selfScore}
                      disabled={!editable}
                      onChange={(v) => update(m.id, { selfScore: v })}
                    />
                  </div>
                  {showManager && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Manager rating</p>
                      <RatingInput value={m.managerScore} disabled />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    Comment <span className="text-destructive">*</span>
                  </p>
                  <Textarea
                    placeholder="Add a comment or evidence (required)"
                    value={m.selfComment ?? ""}
                    disabled={!editable}
                    onChange={(e) => update(m.id, { selfComment: e.target.value })}
                    className="min-h-16"
                  />
                </div>
                {showManager && m.managerComment && (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your feedback for the company</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Share suggestions, blockers, or what would help you do your best work."
            value={feedback}
            disabled={!editable}
            onChange={(e) => setFeedback(e.target.value)}
            className="min-h-28"
          />
        </CardContent>
      </Card>

      {editable && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => persist(false)} disabled={pending !== null}>
            {pending === "save" ? <Loader2 className="size-4 animate-spin" /> : <SaveIcon />}
            Save draft
          </Button>
          <Button onClick={() => persist(true)} disabled={pending !== null}>
            {pending === "submit" ? <Loader2 className="size-4 animate-spin" /> : <SendIcon />}
            {resubmit ? "Update & resubmit" : "Submit to manager"}
          </Button>
        </div>
      )}
    </div>
  );
}
