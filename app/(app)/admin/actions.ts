"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";

const DEFAULT_PASSWORD = "Codeblaze@2026";

// ---------- Employees ----------
export async function updateEmployee(
  userId: string,
  data: { kpiRoleId: string | null; managerId: string | null; accessRole: string }
) {
  await requireAdmin();
  await db.user.update({
    where: { id: userId },
    data: {
      kpiRoleId: data.kpiRoleId || null,
      managerId: data.managerId || null,
      accessRole: data.accessRole
    }
  });
  revalidatePath("/admin/employees");
  return { ok: true as const };
}

export async function updateEmployeeInfo(
  userId: string,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    employeeId: string;
    empCode: string;
  }
) {
  await requireAdmin();
  const firstName = data.firstName.trim();
  const lastName = data.lastName.trim();
  const email = data.email.trim().toLowerCase();
  const jobTitle = data.jobTitle.trim();
  const employeeId = data.employeeId.trim();
  const empCode = data.empCode.trim();

  if (!firstName || !lastName) return { ok: false as const, error: "Name is required" };
  if (!email) return { ok: false as const, error: "Email is required" };
  if (!employeeId) return { ok: false as const, error: "Employee ID is required" };

  const emailClash = await db.user.findFirst({
    where: { email, id: { not: userId } },
    select: { id: true }
  });
  if (emailClash) return { ok: false as const, error: "Email already in use" };

  const idClash = await db.user.findFirst({
    where: { employeeId, id: { not: userId } },
    select: { id: true }
  });
  if (idClash) return { ok: false as const, error: "Employee ID already in use" };

  if (empCode) {
    const codeClash = await db.user.findFirst({
      where: { empCode, id: { not: userId } },
      select: { id: true }
    });
    if (codeClash) return { ok: false as const, error: "Emp code already in use" };
  }

  await db.user.update({
    where: { id: userId },
    data: { firstName, lastName, email, jobTitle, employeeId, empCode: empCode || null }
  });
  revalidatePath("/admin/employees");
  return { ok: true as const };
}

export async function resetEmployeePassword(userId: string) {
  await requireAdmin();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await db.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true }
  });
  revalidatePath("/admin/employees");
  return { ok: true as const, password: DEFAULT_PASSWORD };
}

export async function setEmployeeActive(userId: string, isActive: boolean) {
  await requireAdmin();
  await db.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/admin/employees");
  return { ok: true as const };
}

// ---------- KPI Roles ----------
export async function createKpiRole(data: {
  name: string;
  experience: string;
  description: string;
}) {
  await requireAdmin();
  if (!data.name.trim()) return { ok: false, error: "Name is required" };
  const existing = await db.kpiRole.findUnique({ where: { name: data.name.trim() } });
  if (existing) return { ok: false, error: "A role with this name already exists" };
  await db.kpiRole.create({
    data: {
      name: data.name.trim(),
      experience: data.experience || null,
      description: data.description || null
    }
  });
  revalidatePath("/admin/roles");
  revalidatePath("/admin/kpis");
  return { ok: true as const };
}

export async function deleteKpiRole(id: string) {
  await requireAdmin();
  await db.kpiRole.delete({ where: { id } });
  revalidatePath("/admin/roles");
  revalidatePath("/admin/kpis");
  return { ok: true as const };
}

// ---------- Categories ----------
export async function upsertCategory(data: {
  id?: string;
  kpiRoleId: string;
  name: string;
  weight: number;
  order: number;
}) {
  await requireAdmin();
  if (data.id) {
    await db.kpiCategory.update({
      where: { id: data.id },
      data: { name: data.name, weight: data.weight, order: data.order }
    });
  } else {
    await db.kpiCategory.create({
      data: {
        kpiRoleId: data.kpiRoleId,
        name: data.name,
        weight: data.weight,
        order: data.order
      }
    });
  }
  revalidatePath("/admin/kpis");
  return { ok: true as const };
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  await db.kpiCategory.delete({ where: { id } });
  revalidatePath("/admin/kpis");
  return { ok: true as const };
}

// ---------- Metrics ----------
export async function upsertMetric(data: {
  id?: string;
  categoryId: string;
  description: string;
  target: string;
  order: number;
}) {
  await requireAdmin();
  if (data.id) {
    await db.kpiMetric.update({
      where: { id: data.id },
      data: { description: data.description, target: data.target || null, order: data.order }
    });
  } else {
    await db.kpiMetric.create({
      data: {
        categoryId: data.categoryId,
        description: data.description,
        target: data.target || null,
        order: data.order
      }
    });
  }
  revalidatePath("/admin/kpis");
  return { ok: true as const };
}

export async function deleteMetric(id: string) {
  await requireAdmin();
  await db.kpiMetric.delete({ where: { id } });
  revalidatePath("/admin/kpis");
  return { ok: true as const };
}

// ---------- Cycles ----------
export async function createCycle(data: { name: string; type: string; year: number }) {
  await requireAdmin();
  const exists = await db.reviewCycle.findUnique({
    where: { type_year: { type: data.type, year: data.year } }
  });
  if (exists) return { ok: false, error: "A cycle of this type already exists for that year" };
  await db.reviewCycle.create({
    data: { name: data.name, type: data.type, year: data.year, status: "DRAFT" }
  });
  revalidatePath("/admin/cycles");
  return { ok: true as const };
}

export async function setCycleStatus(id: string, status: string) {
  await requireAdmin();
  await db.reviewCycle.update({
    where: { id },
    data: {
      status,
      opensAt: status === "OPEN" ? new Date() : undefined,
      closesAt: status === "CLOSED" ? new Date() : undefined
    }
  });
  revalidatePath("/admin/cycles");
  return { ok: true as const };
}

/** Create reviews + metric snapshots for all active users with a KPI role who lack one. */
export async function generateReviews(cycleId: string) {
  await requireAdmin();
  const users = await db.user.findMany({
    where: { kpiRoleId: { not: null }, isActive: true },
    include: { kpiRole: { include: { categories: { include: { metrics: true } } } } }
  });
  const existing = await db.review.findMany({
    where: { cycleId },
    select: { employeeId: true }
  });
  const have = new Set(existing.map((e) => e.employeeId));

  let created = 0;
  for (const u of users) {
    if (have.has(u.id) || !u.kpiRole) continue;
    const metricRows: {
      metricId: string;
      categoryName: string;
      categoryWeight: number;
      metricText: string;
      target: string | null;
      order: number;
    }[] = [];
    for (const cat of u.kpiRole.categories) {
      for (const m of cat.metrics) {
        metricRows.push({
          metricId: m.id,
          categoryName: cat.name,
          categoryWeight: cat.weight,
          metricText: m.description,
          target: m.target,
          order: cat.order * 1000 + m.order
        });
      }
    }
    await db.review.create({
      data: {
        cycleId,
        employeeId: u.id,
        managerId: u.managerId,
        status: "NOT_STARTED",
        metricScores: { create: metricRows }
      }
    });
    created++;
  }
  revalidatePath("/admin/cycles");
  return { ok: true as const, created };
}
