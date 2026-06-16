/**
 * Data migration — 2026-06-16
 *
 * Re-snapshots review questions for every active employee with a KPI role in
 * the currently OPEN review cycle, so reviews reflect the latest KPI templates
 * (e.g. Program Manager's new metrics, edited role trees).
 *
 * SAFETY: only refreshes reviews that are still NOT_STARTED. Any review with
 * entered self/manager scores or comments (status beyond NOT_STARTED) is left
 * untouched and reported — we never overwrite work in progress. Creates a
 * review for role-assigned employees who don't have one yet.
 *
 * Run:  pnpm tsx prisma/data-migrations/2026-06-16-regen-review-snapshots.ts
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const db = new PrismaClient();

async function main() {
  console.log("Data migration 2026-06-16: regenerate review snapshots...");

  const cycle = await db.reviewCycle.findFirst({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" }
  });
  if (!cycle) {
    console.error("  ! No OPEN review cycle — nothing to do.");
    return;
  }
  console.log(`  Cycle: ${cycle.name} (${cycle.id})`);

  const users = await db.user.findMany({
    where: { kpiRoleId: { not: null }, isActive: true },
    include: { kpiRole: { include: { categories: { include: { metrics: true } } } } }
  });

  let created = 0;
  let refreshed = 0;
  let skipped = 0;

  for (const u of users) {
    if (!u.kpiRole) continue;

    const metricRows = u.kpiRole.categories.flatMap((cat) =>
      cat.metrics.map((m) => ({
        metricId: m.id,
        categoryName: cat.name,
        categoryWeight: cat.weight,
        metricText: m.description,
        target: m.target,
        order: cat.order * 1000 + m.order
      }))
    );

    const existing = await db.review.findUnique({
      where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: u.id } }
    });

    if (!existing) {
      await db.review.create({
        data: {
          cycleId: cycle.id,
          employeeId: u.id,
          managerId: u.managerId,
          status: "NOT_STARTED",
          metricScores: { create: metricRows }
        }
      });
      created++;
      console.log(`  + created review for ${u.firstName} ${u.lastName} (${u.kpiRole.name}, ${metricRows.length} metrics)`);
      continue;
    }

    if (existing.status !== "NOT_STARTED") {
      skipped++;
      console.warn(`  ! skipped ${u.firstName} ${u.lastName} — review is ${existing.status} (has progress)`);
      continue;
    }

    await db.metricScore.deleteMany({ where: { reviewId: existing.id } });
    await db.review.update({
      where: { id: existing.id },
      data: { managerId: u.managerId, metricScores: { create: metricRows } }
    });
    refreshed++;
    console.log(`  ↻ refreshed ${u.firstName} ${u.lastName} (${u.kpiRole.name}, ${metricRows.length} metrics)`);
  }

  console.log(`\nDone. created=${created} refreshed=${refreshed} skipped(in-progress)=${skipped}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
