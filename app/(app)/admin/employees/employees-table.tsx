"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRoundIcon, Loader2, PencilIcon, SaveIcon } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/date-picker";
import {
  updateEmployee,
  updateEmployeeInfo,
  resetEmployeePassword
} from "@/app/(app)/admin/actions";

const NONE = "__none__";
const ACCESS_ROLES = ["EMPLOYEE", "MANAGER", "SUPER_ADMIN"];

export type EmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  name: string;
  email: string;
  jobTitle: string;
  accessRole: string;
  kpiRoleId: string | null;
  managerId: string | null;
  // ISO date strings (yyyy-mm-ddT...), or null
  dateOfJoining: string | null;
  careerStartDate: string | null;
};

/** Whole + fractional years between a past date and now, formatted "Ny Mm". */
function yearsSince(iso: string | null): string | null {
  if (!iso) return null;
  const from = new Date(iso);
  const now = new Date();
  let months = (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
  if (now.getDate() < from.getDate()) months -= 1;
  if (months < 0) return null;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y}y ${m}m`;
}

type Option = { id: string; name: string };

export function EmployeesTable({
  employees,
  kpiRoles,
  managers
}: {
  employees: EmployeeRow[];
  kpiRoles: Option[];
  managers: Option[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<EmployeeRow[]>(employees);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [savingInfo, setSavingInfo] = useState(false);

  function update(id: string, patch: Partial<EmployeeRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function save(row: EmployeeRow) {
    setBusy(row.id);
    const res = await updateEmployee(row.id, {
      kpiRoleId: row.kpiRoleId,
      managerId: row.managerId,
      accessRole: row.accessRole
    });
    setBusy(null);
    if (res.ok) toast.success(`Saved ${row.name}`);
    else toast.error("Save failed");
    router.refresh();
  }

  async function reset(row: EmployeeRow) {
    setBusy(row.id);
    const res = await resetEmployeePassword(row.id);
    setBusy(null);
    if (res.ok) toast.success(`Password reset to ${res.password}`);
  }

  async function saveInfo() {
    if (!editing) return;
    setSavingInfo(true);
    const res = await updateEmployeeInfo(editing.id, {
      firstName: editing.firstName,
      lastName: editing.lastName,
      email: editing.email,
      jobTitle: editing.jobTitle,
      employeeId: editing.employeeId,
      dateOfJoining: editing.dateOfJoining,
      careerStartDate: editing.careerStartDate
    });
    setSavingInfo(false);
    if (res.ok) {
      update(editing.id, {
        firstName: editing.firstName,
        lastName: editing.lastName,
        name: `${editing.firstName} ${editing.lastName}`,
        email: editing.email,
        jobTitle: editing.jobTitle,
        employeeId: editing.employeeId,
        dateOfJoining: editing.dateOfJoining,
        careerStartDate: editing.careerStartDate
      });
      toast.success(`Updated ${editing.firstName} ${editing.lastName}`);
      setEditing(null);
      router.refresh();
    } else {
      toast.error(res.error ?? "Update failed");
    }
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>KPI Role</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead>Access</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="font-medium">{r.name}</div>
                <div className="text-muted-foreground text-xs">{r.email}</div>
                <div className="text-muted-foreground text-xs">{r.jobTitle}</div>
              </TableCell>
              <TableCell>
                <Select
                  value={r.kpiRoleId ?? NONE}
                  onValueChange={(v) => update(r.id, { kpiRoleId: v === NONE ? null : v })}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>
                      <span className="text-muted-foreground">Unassigned</span>
                    </SelectItem>
                    {kpiRoles.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={r.managerId ?? NONE}
                  onValueChange={(v) => update(r.id, { managerId: v === NONE ? null : v })}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>
                      <span className="text-muted-foreground">None</span>
                    </SelectItem>
                    {managers
                      .filter((m) => m.id !== r.id)
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={r.accessRole}
                  onValueChange={(v) => update(r.id, { accessRole: v })}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_ROLES.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(r)}
                    disabled={busy === r.id}
                    title="Edit employee info">
                    <PencilIcon />
                  </Button>
                  <Button size="sm" onClick={() => save(r)} disabled={busy === r.id}>
                    {busy === r.id ? <Loader2 className="size-4 animate-spin" /> : <SaveIcon />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reset(r)}
                    disabled={busy === r.id}
                    title="Reset password to default">
                    <KeyRoundIcon />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit employee</DialogTitle>
            <DialogDescription>
              Update personal and job details. Joining dates drive tenure and total experience.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={editing.firstName}
                    onChange={(e) => setEditing({ ...editing, firstName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={editing.lastName}
                    onChange={(e) => setEditing({ ...editing, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editing.email}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    value={editing.employeeId}
                    onChange={(e) => setEditing({ ...editing, employeeId: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="jobTitle">Job title</Label>
                  <Input
                    id="jobTitle"
                    value={editing.jobTitle}
                    onChange={(e) => setEditing({ ...editing, jobTitle: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Date of joining (current org)</Label>
                  <DatePicker
                    date={editing.dateOfJoining ? new Date(editing.dateOfJoining) : undefined}
                    setDate={(d) =>
                      setEditing({ ...editing, dateOfJoining: d ? d.toISOString() : null })
                    }
                    placeholder="Not set"
                  />
                  {yearsSince(editing.dateOfJoining) && (
                    <p className="text-muted-foreground text-xs">
                      Current tenure: {yearsSince(editing.dateOfJoining)}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Career start (industry)</Label>
                  <DatePicker
                    date={editing.careerStartDate ? new Date(editing.careerStartDate) : undefined}
                    setDate={(d) =>
                      setEditing({ ...editing, careerStartDate: d ? d.toISOString() : null })
                    }
                    placeholder="Not set"
                  />
                  {yearsSince(editing.careerStartDate) && (
                    <p className="text-muted-foreground text-xs">
                      Total experience: {yearsSince(editing.careerStartDate)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={savingInfo}>
              Cancel
            </Button>
            <Button onClick={saveInfo} disabled={savingInfo}>
              {savingInfo ? <Loader2 className="size-4 animate-spin" /> : <SaveIcon />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
