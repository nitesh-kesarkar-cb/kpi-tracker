/**
 * Data migration — 2026-06-15
 *
 * Adds 3 new users (Sneha/PM, Jordan/COO, Nick/CEO) and updates 1 existing
 * user (Bhushan PW1221 → Software Engineer 2, new email).
 *
 * Idempotent: upserts by employeeId, so safe to re-run. Does NOT wipe data
 * like prisma/seed.ts. Reviews are only (re)snapshotted when none exists yet
 * or the existing review is still NOT_STARTED (no scores would be lost).
 *
 * Run against Neon:  pnpm tsx prisma/data-migrations/2026-06-15-add-users.ts
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

// Match prisma.config.ts: the live Postgres (Neon) URL lives in .env.local,
// not .env (which holds a stale SQLite url). Load it before the client inits.
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const db = new PrismaClient();
const DEFAULT_PASSWORD = "Codeblaze@2026";

type NewUser = {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  accessRole: "EMPLOYEE" | "MANAGER" | "SUPER_ADMIN";
  kpiRoleName?: string; // KpiRole.name to assign (must already exist)
};

// New hires / leadership. Emp codes supplied by Nitesh (placeholder range).
const NEW_USERS: NewUser[] = [
  {
    employeeId: "PW900001",
    firstName: "Sneha",
    lastName: "Shanty",
    email: "sneha.shanty@codeblaze.ae",
    jobTitle: "Project Manager",
    accessRole: "MANAGER",
    kpiRoleName: "Engineering Manager" // no PM template; mirror Technical PM mapping
  },
  {
    employeeId: "PW900002",
    firstName: "Jordan",
    lastName: "Sims",
    email: "jordan.sims@codeblaze.ae",
    jobTitle: "COO",
    accessRole: "MANAGER"
    // exec — no KPI template, no review
  },
  {
    employeeId: "PW900003",
    firstName: "Nick",
    lastName: "Gole",
    email: "nick@codeblaze.ae", // intentionally not first.last
    jobTitle: "CEO",
    accessRole: "SUPER_ADMIN"
    // exec — no KPI template, no review
  }
];

type UpdateUser = {
  employeeId: string;
  email?: string;
  jobTitle?: string;
  kpiRoleName?: string;
};

// Existing users with changed details.
const UPDATES: UpdateUser[] = [
  {
    employeeId: "PW1221", // Bhushan Sonawane: Data Analyst → Software Engineer 2
    email: "bhushan.s@codeblaze.ae",
    jobTitle: "Software Engineer 2",
    kpiRoleName: "Software Engineer-2"
  }
];

async function roleIdByName(name?: string): Promise<string | null> {
  if (!name) return null;
  const role = await db.kpiRole.findUnique({ where: { name } });
  if (!role) {
    console.warn(`  ! KPI role "${name}" not found — leaving unassigned`);
    return null;
  }
  return role.id;
}

async function audit(
  action: string,
  userId: string,
  summary: string,
  metadata: Record<string, unknown>
) {
  await db.auditLog.create({
    data: {
      actorId: null,
      actorName: "data-migration",
      actorEmail: "system@codeblaze.ae",
      category: "ADMIN",
      action,
      entityType: "User",
      entityId: userId,
      summary,
      metadata: metadata as Prisma.InputJsonValue
    }
  });
}

/**
 * Snapshot the user's current KPI role into a review for the open Mid-Year 2026
 * cycle. Creates a review if missing; re-snapshots an existing one only when it
 * is still NOT_STARTED (so we never clobber entered scores).
 */
async function ensureReview(userId: string) {
  const cycle = await db.reviewCycle.findFirst({
    where: { type: "MID_YEAR", year: 2026 }
  });
  if (!cycle) {
    console.warn("  ! No Mid-Year 2026 cycle — skipping review generation");
    return;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { kpiRole: { include: { categories: { include: { metrics: true } } } } }
  });
  if (!user?.kpiRole) return; // no role → no review

  const existing = await db.review.findUnique({
    where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: userId } }
  });
  if (existing && existing.status !== "NOT_STARTED") {
    console.warn(
      `  ! Review for ${user.email} is ${existing.status} — leaving as-is (manual re-snapshot needed if role changed)`
    );
    return;
  }

  const metricRows = user.kpiRole.categories.flatMap((cat) =>
    cat.metrics.map((m) => ({
      metricId: m.id,
      categoryName: cat.name,
      categoryWeight: cat.weight,
      metricText: m.description,
      target: m.target,
      order: cat.order * 1000 + m.order
    }))
  );

  if (existing) {
    await db.metricScore.deleteMany({ where: { reviewId: existing.id } });
    await db.review.update({
      where: { id: existing.id },
      data: { managerId: user.managerId, metricScores: { create: metricRows } }
    });
    console.log(`  ↻ Re-snapshotted review (${metricRows.length} metrics) for ${user.email}`);
  } else {
    await db.review.create({
      data: {
        cycleId: cycle.id,
        employeeId: userId,
        managerId: user.managerId,
        status: "NOT_STARTED",
        metricScores: { create: metricRows }
      }
    });
    console.log(`  + Created review (${metricRows.length} metrics) for ${user.email}`);
  }
}

async function main() {
  console.log("Data migration 2026-06-15: add/update users...");
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 1) New users (upsert by employeeId)
  for (const u of NEW_USERS) {
    const kpiRoleId = await roleIdByName(u.kpiRoleName);
    const existing = await db.user.findUnique({ where: { employeeId: u.employeeId } });

    const user = await db.user.upsert({
      where: { employeeId: u.employeeId },
      // On re-run, refresh details but never reset password / mustChangePassword.
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        jobTitle: u.jobTitle,
        accessRole: u.accessRole,
        kpiRoleId
      },
      create: {
        employeeId: u.employeeId,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        passwordHash,
        jobTitle: u.jobTitle,
        accessRole: u.accessRole,
        mustChangePassword: true,
        kpiRoleId
      }
    });

    console.log(`  ${existing ? "~" : "+"} ${u.email} (${u.employeeId}) ${u.accessRole}`);
    await audit(
      existing ? "employee.update" : "employee.create",
      user.id,
      `${existing ? "Updated" : "Created"} ${u.firstName} ${u.lastName} (${u.jobTitle})`,
      { employeeId: u.employeeId, accessRole: u.accessRole, kpiRoleName: u.kpiRoleName ?? null }
    );

    if (kpiRoleId) await ensureReview(user.id);
  }

  // 2) Updates to existing users
  for (const u of UPDATES) {
    const existing = await db.user.findUnique({ where: { employeeId: u.employeeId } });
    if (!existing) {
      console.warn(`  ! ${u.employeeId} not found — skipping update`);
      continue;
    }
    const kpiRoleId =
      u.kpiRoleName !== undefined ? await roleIdByName(u.kpiRoleName) : undefined;

    const user = await db.user.update({
      where: { employeeId: u.employeeId },
      data: {
        ...(u.email !== undefined ? { email: u.email } : {}),
        ...(u.jobTitle !== undefined ? { jobTitle: u.jobTitle } : {}),
        ...(kpiRoleId !== undefined ? { kpiRoleId } : {})
      }
    });

    console.log(`  ~ ${user.email} (${u.employeeId}) → ${u.jobTitle ?? existing.jobTitle}`);
    await audit("employee.update", user.id, `Updated ${user.firstName} ${user.lastName}`, {
      employeeId: u.employeeId,
      before: { email: existing.email, jobTitle: existing.jobTitle, kpiRoleId: existing.kpiRoleId },
      after: { email: user.email, jobTitle: user.jobTitle, kpiRoleId: user.kpiRoleId }
    });

    // Role changed → re-snapshot the open-cycle review (only if NOT_STARTED).
    if (kpiRoleId !== undefined) await ensureReview(user.id);
  }

  console.log("Migration complete.");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
