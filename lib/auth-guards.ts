import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  accessRole: string;
  mustChangePassword: boolean;
};

/** Returns the current session user or redirects to /login. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const u = session.user as any;
  return {
    id: u.id,
    name: u.name ?? "",
    email: u.email ?? "",
    accessRole: u.accessRole,
    mustChangePassword: u.mustChangePassword
  };
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.accessRole !== "SUPER_ADMIN") redirect("/dashboard");
  return u;
}

export async function requireManager(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.accessRole !== "MANAGER" && u.accessRole !== "SUPER_ADMIN") redirect("/dashboard");
  return u;
}

export function isAdmin(u: SessionUser) {
  return u.accessRole === "SUPER_ADMIN";
}
export function isManager(u: SessionUser) {
  return u.accessRole === "MANAGER" || u.accessRole === "SUPER_ADMIN";
}

/**
 * Asserts the current user owns (is the employee of) this review.
 * Returns the session user. Throws/redirects otherwise.
 */
export async function assertReviewOwner(reviewId: string): Promise<SessionUser> {
  const u = await requireUser();
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { employeeId: true }
  });
  if (!review || review.employeeId !== u.id) redirect("/reviews");
  return u;
}

/**
 * Asserts the current user is the manager of the review's employee (or super admin).
 */
export async function assertReviewManager(reviewId: string): Promise<SessionUser> {
  const u = await requireUser();
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { managerId: true }
  });
  if (!review) redirect("/team");
  if (u.accessRole === "SUPER_ADMIN") return u;
  if (review.managerId !== u.id) redirect("/team");
  return u;
}
