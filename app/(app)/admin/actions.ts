"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const DEFAULT_PASSWORD = "Codeblaze@2026";

// ---------- Employees ----------
export async function updateEmployee(
  userId: string,
  data: { kpiRoleId: string | null; managerId: string | null; accessRole: string }
) {
  const admin = await requireAdmin();
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, accessRole: true, kpiRoleId: true, managerId: true }
  });
  await db.user.update({
    where: { id: userId },
    data: {
      kpiRoleId: data.kpiRoleId || null,
      managerId: data.managerId || null,
      accessRole: data.accessRole
    }
  });
  await logAudit({
    actor: admin,
    category: "ADMIN",
    action: "employee.update_assignment",
    entityType: "User",
    entityId: userId,
    summary: `Updated role/manager/access for ${target?.firstName ?? ""} ${target?.lastName ?? ""}`.trim(),
    metadata: { before: target, after: data }
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
    dateOfJoining: string | null;
    careerStartDate: string | null;
  }
) {
  const admin = await requireAdmin();
  const firstName = data.firstName.trim();
  const lastName = data.lastName.trim();
  const email = data.email.trim().toLowerCase();
  const jobTitle = data.jobTitle.trim();
  const employeeId = data.employeeId.trim();
  const dateOfJoining = data.dateOfJoining ? new Date(data.dateOfJoining) : null;
  const careerStartDate = data.careerStartDate ? new Date(data.careerStartDate) : null;

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

  await db.user.update({
    where: { id: userId },
    data: { firstName, lastName, email, jobTitle, employeeId, dateOfJoining, careerStartDate }
  });
  await logAudit({
    actor: admin,
    category: "ADMIN",
    action: "employee.update_info",
    entityType: "User",
    entityId: userId,
    summary: `Edited profile of ${firstName} ${lastName} (${employeeId})`,
    metadata: { firstName, lastName, email, jobTitle, employeeId, dateOfJoining, careerStartDate }
  });
  revalidatePath("/admin/employees");
  return { ok: true as const };
}

export async function resetEmployeePassword(userId: string) {
  const admin = await requireAdmin();
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true }
  });
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await db.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true }
  });
  await logAudit({
    actor: admin,
    category: "ADMIN",
    action: "employee.reset_password",
    entityType: "User",
    entityId: userId,
    summary: `Reset password for ${target?.firstName ?? ""} ${target?.lastName ?? ""}`.trim()
  });
  revalidatePath("/admin/employees");
  return { ok: true as const, password: DEFAULT_PASSWORD };
}

export async function setEmployeeActive(userId: string, isActive: boolean) {
  const admin = await requireAdmin();
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true }
  });
  await db.user.update({ where: { id: userId }, data: { isActive } });
  await logAudit({
    actor: admin,
    category: "ADMIN",
    action: isActive ? "employee.activate" : "employee.deactivate",
    entityType: "User",
    entityId: userId,
    summary: `${isActive ? "Activated" : "Deactivated"} ${target?.firstName ?? ""} ${target?.lastName ?? ""}`.trim()
  });
  revalidatePath("/admin/employees");
  return { ok: true as const };
}

// ---------- KPI Roles ----------
export async function createKpiRole(data: {
  name: string;
  experience: string;
  description: string;
}) {
  const admin = await requireAdmin();
  if (!data.name.trim()) return { ok: false, error: "Name is required" };
  const existing = await db.kpiRole.findUnique({ where: { name: data.name.trim() } });
  if (existing) return { ok: false, error: "A role with this name already exists" };
  const role = await db.kpiRole.create({
    data: {
      name: data.name.trim(),
      experience: data.experience || null,
      description: data.description || null
    }
  });
  await logAudit({
    actor: admin,
    category: "ADMIN",
    action: "kpi_role.create",
    entityType: "KpiRole",
    entityId: role.id,
    summary: `Created KPI role "${role.name}"`,
    metadata: { experience: data.experience, description: data.description }
  });
  revalidatePath("/admin/roles");
  revalidatePath("/admin/kpis");
  return { ok: true as const };
}

export async function updateKpiRole(data: {
  id: string;
  name: string;
  experience: string;
  description: string;
}) {
  const admin = await requireAdmin();
  const name = data.name.trim();
  if (!name) return { ok: false, error: "Name is required" };

  const before = await db.kpiRole.findUnique({
    where: { id: data.id },
    select: { name: true, experience: true, description: true }
  });
  if (!before) return { ok: false, error: "Role not found" };

  // Name is unique — reject if another role already uses the new name.
  const clash = await db.kpiRole.findUnique({ where: { name } });
  if (clash && clash.id !== data.id)
    return { ok: false, error: "A role with this name already exists" };

  const role = await db.kpiRole.update({
    where: { id: data.id },
    data: {
      name,
      experience: data.experience.trim() || null,
      description: data.description.trim() || null
    }
  });
  await logAudit({
    actor: admin,
    category: "ADMIN",
    action: "kpi_role.update",
    entityType: "KpiRole",
    entityId: role.id,
    summary: `Updated KPI role "${role.name}"`,
    metadata: {
      before,
      after: { name: role.name, experience: role.experience, description: role.description }
    }
  });
  revalidatePath("/admin/roles");
  revalidatePath("/admin/kpis");
  return { ok: true as const };
}

export async function deleteKpiRole(id: string) {
  const admin = await requireAdmin();
  const role = await db.kpiRole.findUnique({ where: { id }, select: { name: true } });
  await db.kpiRole.delete({ where: { id } });
  await logAudit({
    actor: admin,
    category: "ADMIN",
    action: "kpi_role.delete",
    entityType: "KpiRole",
    entityId: id,
    summary: `Deleted KPI role "${role?.name ?? id}"`
  });
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
  const admin = await requireAdmin();
  if (data.id) {
    await db.kpiCategory.update({
      where: { id: data.id },
      data: { name: data.name, weight: data.weight, order: data.order }
    });
  } else {
    const created = await db.kpiCategory.create({
      data: {
        kpiRoleId: data.kpiRoleId,
        name: data.name,
        weight: data.weight,
        order: data.order
      }
    });
    data = { ...data, id: created.id };
  }
  await logAudit({
    actor: admin,
    category: "ADMIN",
    action: data.id ? "kpi_category.update" : "kpi_category.create",
    entityType: "KpiCategory",
    entityId: data.id,
    summary: `${data.id ? "Updated" : "Created"} category "${data.name}" (${data.weight}%)`,
    metadata: { kpiRoleId: data.kpiRoleId, weight: data.weight, order: data.order }
  });
  revalidatePath("/admin/kpis");
  return { ok: true as const };
}

export async function deleteCategory(id: string) {
  const admin = await requireAdmin();
  const cat = await db.kpiCategory.findUnique({ where: { id }, select: { name: true } });
  await db.kpiCategory.delete({ where: { id } });
  await logAudit({
    actor: admin,
    category: "ADMIN",
    action: "kpi_category.delete",
    entityType: "KpiCategory",
    entityId: id,
    summary: `Deleted category "${cat?.name ?? id}"`
  });
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
  const admin = await requireAdmin();
  if (data.id) {
    await db.kpiMetric.update({
      where: { id: data.id },
      data: { description: data.description, target: data.target || null, order: data.order }
    });
  } else {
    const created = await db.kpiMetric.create({
      data: {
        categoryId: data.categoryId,
        description: data.description,
        target: data.target || null,
        order: data.order
      }
    });
    data = { ...data, id: created.id };
  }
  await logAudit({
    actor: admin,
    category: "ADMIN",
    action: data.id ? "kpi_metric.update" : "kpi_metric.create",
    entityType: "KpiMetric",
    entityId: data.id,
    summary: `${data.id ? "Updated" : "Created"} metric "${data.description.slice(0, 60)}"`,
    metadata: { categoryId: data.categoryId, target: data.target, order: data.order }
  });
  revalidatePath("/admin/kpis");
  return { ok: true as const };
}

export async function deleteMetric(id: string) {
  const admin = await requireAdmin();
  const metric = await db.kpiMetric.findUnique({ where: { id }, select: { description: true } });
  await db.kpiMetric.delete({ where: { id } });
  await logAudit({
    actor: admin,
    category: "ADMIN",
    action: "kpi_metric.delete",
    entityType: "KpiMetric",
    entityId: id,
    summary: `Deleted metric "${(metric?.description ?? id).slice(0, 60)}"`
  });
  revalidatePath("/admin/kpis");
  return { ok: true as const };
}

// ---------- Cycles ----------
export async function createCycle(data: { name: string; type: string; year: number }) {
  const admin = await requireAdmin();
  const exists = await db.reviewCycle.findUnique({
    where: { type_year: { type: data.type, year: data.year } }
  });
  if (exists) return { ok: false, error: "A cycle of this type already exists for that year" };
  const cycle = await db.reviewCycle.create({
    data: { name: data.name, type: data.type, year: data.year, status: "DRAFT" }
  });
  await logAudit({
    actor: admin,
    category: "ADMIN",
    action: "cycle.create",
    entityType: "ReviewCycle",
    entityId: cycle.id,
    summary: `Created review cycle "${cycle.name}" (${data.type} ${data.year})`
  });
  revalidatePath("/admin/cycles");
  return { ok: true as const };
}

export async function setCycleStatus(id: string, status: string) {
  const admin = await requireAdmin();
  const cycle = await db.reviewCycle.findUnique({ where: { id }, select: { name: true, status: true } });
  await db.reviewCycle.update({
    where: { id },
    data: {
      status,
      opensAt: status === "OPEN" ? new Date() : undefined,
      closesAt: status === "CLOSED" ? new Date() : undefined
    }
  });
  await logAudit({
    actor: admin,
    category: "ADMIN",
    action: "cycle.set_status",
    entityType: "ReviewCycle",
    entityId: id,
    summary: `Set cycle "${cycle?.name ?? id}" status ${cycle?.status ?? "?"} → ${status}`,
    metadata: { from: cycle?.status, to: status }
  });
  revalidatePath("/admin/cycles");
  return { ok: true as const };
}

/** Create reviews + metric snapshots for all active users with a KPI role who lack one. */
export async function generateReviews(cycleId: string) {
  const admin = await requireAdmin();
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
  await logAudit({
    actor: admin,
    category: "ADMIN",
    action: "cycle.generate_reviews",
    entityType: "ReviewCycle",
    entityId: cycleId,
    summary: `Generated ${created} review(s) for cycle`,
    metadata: { created }
  });
  revalidatePath("/admin/cycles");
  return { ok: true as const, created };
}
