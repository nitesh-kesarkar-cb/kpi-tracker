"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronDownIcon,
  ChevronsUpDownIcon,
  ChevronUpIcon,
  GaugeIcon,
  Loader2,
  PencilIcon,
  PlusIcon,
  Trash2Icon
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
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
import { createKpiRole, deleteKpiRole, updateKpiRole } from "@/app/(app)/admin/actions";

export type RoleRow = {
  id: string;
  name: string;
  experience: string | null;
  description: string | null;
  categoryCount: number;
  userCount: number;
};

type SortKey = "name" | "experience" | "categoryCount" | "userCount";
type SortDir = "asc" | "desc";

export function RolesManager({ roles }: { roles: RoleRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [experience, setExperience] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedRoles = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...roles].sort((a, b) => {
      if (sortKey === "categoryCount" || sortKey === "userCount") {
        return (a[sortKey] - b[sortKey]) * dir;
      }
      const av = sortKey === "experience" ? (a.experience ?? "") : a.name;
      const bv = sortKey === "experience" ? (b.experience ?? "") : b.name;
      // Empty experience always sinks to the bottom regardless of direction.
      if (av === "" && bv !== "") return 1;
      if (bv === "" && av !== "") return -1;
      return av.localeCompare(bv, undefined, { sensitivity: "base" }) * dir;
    });
  }, [roles, sortKey, sortDir]);

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

  async function saveEdit() {
    if (!editing) return;
    setSavingEdit(true);
    const res = await updateKpiRole({
      id: editing.id,
      name: editing.name,
      experience: editing.experience ?? "",
      description: editing.description ?? ""
    });
    setSavingEdit(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Role updated");
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string, count: number) {
    if (count > 0 && !confirm("Employees are assigned this role. Delete anyway?")) return;
    const res = await deleteKpiRole(id);
    if (res.ok) toast.success("Role deleted");
    router.refresh();
  }

  function SortHeader({
    label,
    sortKey: key,
    className
  }: {
    label: string;
    sortKey: SortKey;
    className?: string;
  }) {
    const active = sortKey === key;
    const Icon = !active ? ChevronsUpDownIcon : sortDir === "asc" ? ChevronUpIcon : ChevronDownIcon;
    return (
      <TableHead className={className}>
        <button
          type="button"
          onClick={() => toggleSort(key)}
          aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
          className="hover:text-foreground -ml-1 inline-flex items-center gap-1 rounded px-1 font-medium transition-colors">
          {label}
          <Icon className={`size-3.5 ${active ? "" : "text-muted-foreground/60"}`} />
        </button>
      </TableHead>
    );
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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Name" sortKey="name" />
              <SortHeader label="Experience" sortKey="experience" />
              <SortHeader label="Categories" sortKey="categoryCount" />
              <SortHeader label="People" sortKey="userCount" />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRoles.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {r.experience ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{r.categoryCount}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{r.userCount}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(r)}
                      title="Edit role details">
                      <PencilIcon />
                    </Button>
                    <Button asChild size="sm" variant="outline" title="Edit KPIs">
                      <Link href={`/admin/kpis?role=${r.id}`}>
                        <GaugeIcon />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive size-7"
                      onClick={() => remove(r.id, r.userCount)}
                      title="Delete role">
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
            <DialogDescription>
              Rename the designation or update its experience &amp; description.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Experience</Label>
                <Input
                  value={editing.experience ?? ""}
                  onChange={(e) => setEditing({ ...editing, experience: e.target.value })}
                  placeholder="e.g. 0-2 Years"
                />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={savingEdit || !editing?.name.trim()}>
              {savingEdit && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
