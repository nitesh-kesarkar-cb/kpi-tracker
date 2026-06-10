import { db } from "@/lib/db";

export async function getUserWithKpi(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    include: {
      manager: true,
      kpiRole: {
        include: {
          categories: {
            orderBy: { order: "asc" },
            include: { metrics: { orderBy: { order: "asc" } } }
          }
        }
      }
    }
  });
}

export async function getEmployeeReviews(userId: string) {
  return db.review.findMany({
    where: { employeeId: userId },
    orderBy: { createdAt: "desc" },
    include: { cycle: true, manager: true }
  });
}

export async function getReviewDetail(reviewId: string) {
  return db.review.findUnique({
    where: { id: reviewId },
    include: {
      cycle: true,
      employee: { include: { kpiRole: true } },
      manager: true,
      metricScores: { orderBy: { order: "asc" } }
    }
  });
}

export async function getTeamReviews(managerId: string) {
  return db.review.findMany({
    where: { managerId },
    orderBy: [{ cycleId: "desc" }, { createdAt: "desc" }],
    include: { cycle: true, employee: { include: { kpiRole: true } } }
  });
}

export async function getOpenCycle() {
  return db.reviewCycle.findFirst({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" }
  });
}

export function statusLabel(status: string): string {
  switch (status) {
    case "NOT_STARTED":
      return "Not started";
    case "SELF_IN_PROGRESS":
      return "Self-review in progress";
    case "SELF_SUBMITTED":
      return "Awaiting manager";
    case "MANAGER_IN_PROGRESS":
      return "Manager reviewing";
    case "FINALIZED":
      return "Finalized";
    default:
      return status;
  }
}

export function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "FINALIZED") return "default";
  if (status === "NOT_STARTED") return "outline";
  return "secondary";
}
