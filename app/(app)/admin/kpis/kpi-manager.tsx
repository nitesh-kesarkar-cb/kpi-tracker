"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon, SaveIcon } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  upsertCategory,
  deleteCategory,
  upsertMetric,
  deleteMetric
} from "@/app/(app)/admin/actions";

type Metric = { id: string; description: string; target: string | null; order: number };
type Category = {
  id: string;
  name: string;
  weight: number;
  order: number;
  metrics: Metric[];
};
export type RoleTree = { id: string; name: string; categories: Category[] };
type RoleOpt = { id: string; name: string };

export function KpiManager({
  roles,
  role
}: {
  roles: RoleOpt[];
  role: RoleTree | null;
}) {
  const router = useRouter();

  function selectRole(id: string) {
    router.push(`/admin/kpis?role=${id}`);
  }

  const weightSum = role?.categories.reduce((s, c) => s + c.weight, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={role?.id ?? ""} onValueChange={selectRole}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a role to edit" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {role && (
          <Badge variant={weightSum === 100 ? "secondary" : "outline"}>
            Total weight: {weightSum}%{weightSum !== 100 ? " (should be 100%)" : ""}
          </Badge>
        )}
      </div>

      {!role ? (
        <p className="text-muted-foreground">Choose a role above to manage its KPIs.</p>
      ) : (
        <div className="space-y-4">
          {role.categories.map((c) => (
            <CategoryCard key={c.id} category={c} onChange={() => router.refresh()} />
          ))}
          <AddCategory
            kpiRoleId={role.id}
            nextOrder={role.categories.length}
            onChange={() => router.refresh()}
          />
        </div>
      )}
    </div>
  );
}

function CategoryCard({ category, onChange }: { category: Category; onChange: () => void }) {
  const [name, setName] = useState(category.name);
  const [weight, setWeight] = useState(category.weight);

  async function saveCat() {
    const res = await upsertCategory({
      id: category.id,
      kpiRoleId: "",
      name,
      weight: Number(weight) || 0,
      order: category.order
    });
    if (res.ok) toast.success("Category saved");
    onChange();
  }
  async function removeCat() {
    if (!confirm("Delete this category and all its metrics?")) return;
    await deleteCategory(category.id);
    toast.success("Category deleted");
    onChange();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="font-medium" />
          </div>
          <Input
            type="number"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-24"
            min={0}
            max={100}
          />
          <Button size="sm" onClick={saveCat}>
            <SaveIcon /> Save
          </Button>
          <Button size="icon" variant="ghost" onClick={removeCat} className="text-destructive">
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {category.metrics.map((m, i) => (
          <div key={m.id}>
            {i > 0 && <Separator className="mb-3" />}
            <MetricRow metric={m} onChange={onChange} />
          </div>
        ))}
        <AddMetric
          categoryId={category.id}
          nextOrder={category.metrics.length}
          onChange={onChange}
        />
      </CardContent>
    </Card>
  );
}

function MetricRow({ metric, onChange }: { metric: Metric; onChange: () => void }) {
  const [description, setDescription] = useState(metric.description);
  const [target, setTarget] = useState(metric.target ?? "");

  async function save() {
    await upsertMetric({
      id: metric.id,
      categoryId: "",
      description,
      target,
      order: metric.order
    });
    toast.success("Metric saved");
    onChange();
  }
  async function remove() {
    await deleteMetric(metric.id);
    toast.success("Metric deleted");
    onChange();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="min-w-48 flex-1"
        placeholder="Metric description"
      />
      <Input
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="w-48"
        placeholder="Target (optional)"
      />
      <Button size="sm" variant="outline" onClick={save}>
        <SaveIcon />
      </Button>
      <Button size="icon" variant="ghost" onClick={remove} className="text-destructive">
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  );
}

function AddMetric({
  categoryId,
  nextOrder,
  onChange
}: {
  categoryId: string;
  nextOrder: number;
  onChange: () => void;
}) {
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  async function add() {
    if (!description.trim()) return;
    await upsertMetric({ categoryId, description, target, order: nextOrder });
    setDescription("");
    setTarget("");
    toast.success("Metric added");
    onChange();
  }
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="min-w-48 flex-1"
        placeholder="Add a metric…"
      />
      <Input
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="w-48"
        placeholder="Target (optional)"
      />
      <Button size="sm" variant="secondary" onClick={add}>
        <PlusIcon /> Add
      </Button>
    </div>
  );
}

function AddCategory({
  kpiRoleId,
  nextOrder,
  onChange
}: {
  kpiRoleId: string;
  nextOrder: number;
  onChange: () => void;
}) {
  const [name, setName] = useState("");
  const [weight, setWeight] = useState(0);
  async function add() {
    if (!name.trim()) return;
    await upsertCategory({ kpiRoleId, name, weight: Number(weight) || 0, order: nextOrder });
    setName("");
    setWeight(0);
    toast.success("Category added");
    onChange();
  }
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-wrap items-center gap-2 py-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-48 flex-1"
          placeholder="New category name"
        />
        <Input
          type="number"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          className="w-24"
          placeholder="%"
        />
        <Button onClick={add}>
          <PlusIcon /> Add category
        </Button>
      </CardContent>
    </Card>
  );
}
