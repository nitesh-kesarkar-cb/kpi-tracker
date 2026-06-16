"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDownIcon,
  ChevronsUpDownIcon,
  ChevronUpIcon,
  ClipboardListIcon
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusLabel, statusVariant } from "@/lib/queries";

export type ReviewRow = {
  id: string;
  employeeName: string;
  role: string;
  managerName: string;
  status: string;
  selfScore: number | null;
  managerScore: number | null;
};

type SortKey = "employeeName" | "managerName" | "status" | "selfScore" | "managerScore";
type SortDir = "asc" | "desc";

export function ReviewsTable({ reviews }: { reviews: ReviewRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("employeeName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...reviews].sort((a, b) => {
      if (sortKey === "selfScore" || sortKey === "managerScore") {
        const av = a[sortKey];
        const bv = b[sortKey];
        // Null scores always sink to the bottom regardless of direction.
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (av - bv) * dir;
      }
      const av = sortKey === "status" ? statusLabel(a.status) : a[sortKey];
      const bv = sortKey === "status" ? statusLabel(b.status) : b[sortKey];
      return av.localeCompare(bv, undefined, { sensitivity: "base" }) * dir;
    });
  }, [reviews, sortKey, sortDir]);

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
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortHeader label="Employee" sortKey="employeeName" />
            <SortHeader label="Manager" sortKey="managerName" />
            <SortHeader label="Status" sortKey="status" />
            <SortHeader label="Self" sortKey="selfScore" className="text-right" />
            <SortHeader label="Final" sortKey="managerScore" className="text-right" />
            <TableHead className="text-right">View</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center">
                  <ClipboardListIcon className="size-8" />
                  <p>No reviews in this cycle.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.employeeName}</div>
                  <div className="text-muted-foreground text-xs">{r.role}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.managerName || "—"}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {r.selfScore != null ? `${r.selfScore.toFixed(0)}%` : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {r.managerScore != null ? `${r.managerScore.toFixed(0)}%` : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/reviews/${r.id}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
