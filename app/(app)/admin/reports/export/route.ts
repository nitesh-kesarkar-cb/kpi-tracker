import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).accessRole !== "SUPER_ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const cycleId = req.nextUrl.searchParams.get("cycle");
  if (!cycleId) return new NextResponse("Missing cycle", { status: 400 });

  const cycle = await db.reviewCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) return new NextResponse("Cycle not found", { status: 404 });

  const reviews = await db.review.findMany({
    where: { cycleId },
    include: { employee: { include: { kpiRole: true } }, manager: true },
    orderBy: { employee: { firstName: "asc" } }
  });

  const header = [
    "Employee",
    "Email",
    "Job Title",
    "KPI Role",
    "Manager",
    "Status",
    "Self Score %",
    "Final Score %",
    "Final Comments",
    "Improvement Feedback",
    "Manager Comments",
    "Employee Feedback for Company"
  ];

  const lines = [header.map(csvCell).join(",")];
  for (const r of reviews) {
    lines.push(
      [
        `${r.employee.firstName} ${r.employee.lastName}`,
        r.employee.email,
        r.employee.jobTitle,
        r.employee.kpiRole?.name ?? "",
        r.manager ? `${r.manager.firstName} ${r.manager.lastName}` : "",
        r.status,
        r.overallSelfScore != null ? r.overallSelfScore.toFixed(0) : "",
        r.overallManagerScore != null ? r.overallManagerScore.toFixed(0) : "",
        r.finalReviewComments ?? "",
        r.improvementFeedback ?? "",
        r.managerFinalComments ?? "",
        r.employeeCompanyFeedback ?? ""
      ]
        .map(csvCell)
        .join(",")
    );
  }

  const csv = "﻿" + lines.join("\r\n");
  const filename = `kpi-report-${cycle.type}-${cycle.year}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
