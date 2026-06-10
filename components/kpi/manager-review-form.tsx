"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, SaveIcon, CheckCircle2Icon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RatingInput } from "@/components/kpi/rating-input";
import {
  saveManagerReview,
  type ManagerScoreInput,
  type ManagerReviewFeedback
} from "@/app/(app)/team/actions";

export type MgrMetricRow = {
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
  metrics: MgrMetricRow[];
  feedback: ManagerReviewFeedback;
  editable: boolean;
};

export function ManagerReviewForm({ reviewId, metrics, feedback, editable }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<MgrMetricRow[]>(metrics);
  const [fb, setFb] = useState<ManagerReviewFeedback>(feedback);
  const [pending, setPending] = useState<null | "save" | "finalize">(null);

  const grouped = useMemo(() => {
    const map = new Map<string, { weight: number; items: MgrMetricRow[] }>();
    for (const m of rows) {
      const e = map.get(m.categoryName) ?? { weight: m.categoryWeight, items: [] };
      e.items.push(m);
      map.set(m.categoryName, e);
    }
    return Array.from(map.entries());
  }, [rows]);

  function update(id: string, patch: Partial<MgrMetricRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function persist(finalize: boolean) {
    setPending(finalize ? "finalize" : "save");
    const payload: ManagerScoreInput[] = rows.map((r) => ({
      metricScoreId: r.id,
      managerScore: r.managerScore,
      managerComment: r.managerComment ?? ""
    }));
    const res = await saveManagerReview(reviewId, payload, fb, finalize);
    setPending(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(finalize ? "Review finalized" : "Progress saved");
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
                  {m.target && <p className="text-muted-foreground text-xs">Target: {m.target}</p>}
                </div>

                <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Self</p>
                    <RatingInput value={m.selfScore} disabled />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Manager rating</p>
                    <RatingInput
                      value={m.managerScore}
                      disabled={!editable}
                      onChange={(v) => update(m.id, { managerScore: v })}
                    />
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

                <Textarea
                  placeholder="Manager comment (optional)"
                  value={m.managerComment ?? ""}
                  disabled={!editable}
                  onChange={(e) => update(m.id, { managerComment: e.target.value })}
                  className="min-h-16"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review summary &amp; feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FbField
            label="Final review comments"
            placeholder="Overall summary of performance this cycle."
            value={fb.finalReviewComments}
            disabled={!editable}
            onChange={(v) => setFb((p) => ({ ...p, finalReviewComments: v }))}
          />
          <FbField
            label="Areas for improvement"
            placeholder="Specific, actionable development feedback."
            value={fb.improvementFeedback}
            disabled={!editable}
            onChange={(v) => setFb((p) => ({ ...p, improvementFeedback: v }))}
          />
          <FbField
            label="Additional manager comments"
            placeholder="Anything else to note."
            value={fb.managerFinalComments}
            disabled={!editable}
            onChange={(v) => setFb((p) => ({ ...p, managerFinalComments: v }))}
          />
        </CardContent>
      </Card>

      {editable && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => persist(false)} disabled={pending !== null}>
            {pending === "save" ? <Loader2 className="size-4 animate-spin" /> : <SaveIcon />}
            Save progress
          </Button>
          <Button onClick={() => persist(true)} disabled={pending !== null}>
            {pending === "finalize" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2Icon />
            )}
            Finalize review
          </Button>
        </div>
      )}
    </div>
  );
}

function FbField({
  label,
  placeholder,
  value,
  disabled,
  onChange
}: {
  label: string;
  placeholder: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <Textarea
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-24"
      />
    </div>
  );
}
