"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRoundIcon, Loader2, SaveIcon } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateEmployee, resetEmployeePassword } from "@/app/(app)/admin/actions";

const NONE = "__none__";
const ACCESS_ROLES = ["EMPLOYEE", "MANAGER", "SUPER_ADMIN"];

export type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  accessRole: string;
  kpiRoleId: string | null;
  managerId: string | null;
};

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
    </div>
  );
}
