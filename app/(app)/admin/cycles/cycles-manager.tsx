"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, PlusIcon, PlayIcon, LockIcon, RefreshCwIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { createCycle, setCycleStatus, generateReviews } from "@/app/(app)/admin/actions";

export type CycleRow = {
  id: string;
  name: string;
  type: string;
  year: number;
  status: string;
  reviewCount: number;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  OPEN: "default",
  DRAFT: "outline",
  CLOSED: "secondary"
};

export function CyclesManager({ cycles }: { cycles: CycleRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [type, setType] = useState("MID_YEAR");
  const [year, setYear] = useState(2026);
  const [name, setName] = useState("");

  async function create() {
    setBusy("create");
    const res = await createCycle({
      name: name || `${type === "MID_YEAR" ? "Mid-Year" : "Year-End"} Review ${year}`,
      type,
      year: Number(year)
    });
    setBusy(null);
    if (!res.ok) return toast.error(res.error);
    toast.success("Cycle created");
    setName("");
    router.refresh();
  }

  async function status(id: string, s: string) {
    setBusy(id);
    await setCycleStatus(id, s);
    setBusy(null);
    toast.success(`Cycle ${s.toLowerCase()}`);
    router.refresh();
  }

  async function generate(id: string) {
    setBusy(id);
    const res = await generateReviews(id);
    setBusy(null);
    if (res.ok) toast.success(`${res.created} review(s) generated`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create a review cycle</CardTitle>
          <CardDescription>One per type per year (mid-year / year-end).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MID_YEAR">Mid-Year</SelectItem>
                <SelectItem value="YEAR_END">Year-End</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Year</Label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-28"
            />
          </div>
          <div className="space-y-1 flex-1 min-w-48">
            <Label>Name (optional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Auto" />
          </div>
          <Button onClick={create} disabled={busy === "create"}>
            {busy === "create" ? <Loader2 className="size-4 animate-spin" /> : <PlusIcon />}
            Create
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {cycles.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <Badge variant={STATUS_VARIANT[c.status] ?? "outline"}>{c.status}</Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  {c.reviewCount} review{c.reviewCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generate(c.id)}
                  disabled={busy === c.id}>
                  <RefreshCwIcon /> Generate reviews
                </Button>
                {c.status !== "OPEN" && (
                  <Button size="sm" onClick={() => status(c.id, "OPEN")} disabled={busy === c.id}>
                    <PlayIcon /> Open
                  </Button>
                )}
                {c.status === "OPEN" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => status(c.id, "CLOSED")}
                    disabled={busy === c.id}>
                    <LockIcon /> Close
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
