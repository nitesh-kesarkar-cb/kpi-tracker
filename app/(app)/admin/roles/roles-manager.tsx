"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, PlusIcon, Trash2Icon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { createKpiRole, deleteKpiRole } from "@/app/(app)/admin/actions";

export type RoleRow = {
  id: string;
  name: string;
  experience: string | null;
  categoryCount: number;
  userCount: number;
};

export function RolesManager({ roles }: { roles: RoleRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [experience, setExperience] = useState("");
  const [description, setDescription] = useState("");

  async function create() {
    setSaving(true);
    const res = await createKpiRole({ name, experience, description });
    setSaving(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Role created");
    setOpen(false);
    setName("");
    setExperience("");
    setDescription("");
    router.refresh();
  }

  async function remove(id: string, count: number) {
    if (count > 0 && !confirm("Employees are assigned this role. Delete anyway?")) return;
    const res = await deleteKpiRole(id);
    if (res.ok) toast.success("Role deleted");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon /> New role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New KPI role</DialogTitle>
              <DialogDescription>
                Create a designation, then add its categories &amp; metrics under Manage KPIs.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Experience</Label>
                <Input
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="e.g. 0-2 Years"
                />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={saving || !name.trim()}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{r.name}</CardTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive size-7"
                  onClick={() => remove(r.id, r.userCount)}>
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
              {r.experience && (
                <p className="text-muted-foreground text-xs">{r.experience}</p>
              )}
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="flex gap-2">
                <Badge variant="outline">{r.categoryCount} categories</Badge>
                <Badge variant="secondary">{r.userCount} people</Badge>
              </div>
              <Button asChild size="sm" variant="link">
                <Link href={`/admin/kpis?role=${r.id}`}>Edit KPIs</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
