import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ScrollTextIcon } from "lucide-react";

export const metadata = { title: "Audit Log — Admin" };

const PAGE_SIZE = 50;

const CATEGORIES = ["ALL", "ADMIN", "REVIEW", "AUTH", "ACCOUNT", "NAVIGATION"] as const;

const CATEGORY_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ADMIN: "default",
  REVIEW: "secondary",
  AUTH: "outline",
  ACCOUNT: "outline",
  NAVIGATION: "outline"
};

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(d);
}

type SearchParams = Promise<{ category?: string; q?: string; page?: string }>;

export default async function AuditLogPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const category = (sp.category ?? "ALL").toUpperCase();
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.AuditLogWhereInput = {};
  if (category !== "ALL" && CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    where.category = category;
  }
  if (q) {
    where.OR = [
      { summary: { contains: q, mode: "insensitive" } },
      { actorEmail: { contains: q, mode: "insensitive" } },
      { actorName: { contains: q, mode: "insensitive" } },
      { action: { contains: q, mode: "insensitive" } }
    ];
  }

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (next: Partial<{ category: string; q: string; page: number }>) => {
    const params = new URLSearchParams();
    const c = next.category ?? category;
    const query = next.q ?? q;
    const p = next.page ?? page;
    if (c && c !== "ALL") params.set("category", c);
    if (query) params.set("q", query);
    if (p && p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/admin/audit?${s}` : "/admin/audit";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-muted-foreground">
          Append-only record of user activity across the system. {total.toLocaleString()} entries.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <Button
            key={c}
            asChild
            size="sm"
            variant={category === c ? "default" : "outline"}>
            <Link href={buildHref({ category: c, page: 1 })}>{c}</Link>
          </Button>
        ))}
        <form action="/admin/audit" className="ml-auto flex items-center gap-2">
          {category !== "ALL" && <input type="hidden" name="category" value={category} />}
          <Input
            name="q"
            placeholder="Search actor, action, summary…"
            defaultValue={q}
            className="w-64"
          />
          <Button type="submit" size="sm" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center">
            <ScrollTextIcon className="size-8" />
            <p>No matching audit entries.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">When</TableHead>
                  <TableHead className="w-28">Category</TableHead>
                  <TableHead className="w-56">Actor</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="w-36">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {fmtDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={CATEGORY_VARIANT[log.category] ?? "outline"}>
                        {log.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.actorName ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{log.actorName}</span>
                          <span className="text-muted-foreground text-xs">{log.actorEmail}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{log.actorEmail ?? "—"}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span>{log.summary}</span>
                      <span className="text-muted-foreground ml-2 font-mono text-xs">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {log.ipAddress ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline" disabled={page <= 1}>
              <Link href={buildHref({ page: Math.max(1, page - 1) })}>Previous</Link>
            </Button>
            <Button asChild size="sm" variant="outline" disabled={page >= totalPages}>
              <Link href={buildHref({ page: Math.min(totalPages, page + 1) })}>Next</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
