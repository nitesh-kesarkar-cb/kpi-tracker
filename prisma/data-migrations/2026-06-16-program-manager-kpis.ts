/**
 * Data migration — 2026-06-16
 *
 * Populates the "Program Manager" KPI role (already created on prod, 0
 * categories) with its category/metric tree. Follows house style: opens with
 * the shared AI Adoption & Responsible Usage category (25%), then PM-specific
 * categories filling the remaining 75% (weights sum to 100%).
 *
 * Idempotent + safe: only writes if the role currently has NO categories, so
 * a re-run (or a run after manual edits) won't duplicate or clobber anything.
 *
 * Run against Neon:  pnpm tsx prisma/data-migrations/2026-06-16-program-manager-kpis.ts
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const db = new PrismaClient();

const ROLE_NAME = "Program Manager";

// Shared first category — identical metrics to every other role's AI Adoption.
const AI_ADOPTION = {
  name: "AI Adoption & Responsible Usage",
  weight: 25,
  metrics: [
    "Integrates Claude into daily work, analysis and documentation",
    "Measurable effort/TAT improvement with no drop in quality",
    "Validates & refines AI output to meet quality standards",
    "Effective prompting — provides context, iterates, reuses proven patterns",
    "Full compliance with usage policy; zero data-handling violations; no over-reliance",
    "Adopts new Claude features and shares learnings with the team"
  ]
};

// PM-specific categories (75%). A Program Manager owns delivery across multiple
// projects/workstreams — coordination, stakeholders, risk/budget, and strategy.
const CATEGORIES = [
  AI_ADOPTION,
  {
    name: "Program Delivery & Execution",
    weight: 20,
    metrics: [
      "On-time delivery of program milestones across projects",
      "Scope, dependency & cross-workstream management",
      "Deliverable quality meets agreed standards",
      "Maintains an accurate program plan & roadmap"
    ]
  },
  {
    name: "Stakeholder & Communication",
    weight: 15,
    metrics: [
      "Clear, timely stakeholder updates & status reporting",
      "Manages expectations across sponsors and teams",
      "Cross-functional alignment & conflict resolution"
    ]
  },
  {
    name: "Risk, Budget & Governance",
    weight: 15,
    metrics: [
      "Proactive risk identification & mitigation",
      "Budget / resource tracking within targets",
      "Adherence to governance & program processes"
    ]
  },
  {
    name: "Team & Resource Coordination",
    weight: 15,
    metrics: [
      "Effective resource allocation across projects",
      "Removes blockers for delivery teams",
      "Mentors & supports project managers / leads"
    ]
  },
  {
    name: "Strategic Alignment & Improvement",
    weight: 10,
    metrics: [
      "Aligns program outcomes to business objectives",
      "Drives delivery / process improvements",
      "Measurable business impact of the program"
    ]
  }
];

async function main() {
  const totalWeight = CATEGORIES.reduce((s, c) => s + c.weight, 0);
  if (totalWeight !== 100) throw new Error(`Weights must sum to 100% (got ${totalWeight}%)`);

  console.log(`Data migration 2026-06-16: KPIs for "${ROLE_NAME}"...`);

  const role = await db.kpiRole.findUnique({
    where: { name: ROLE_NAME },
    include: { _count: { select: { categories: true } } }
  });
  if (!role) {
    console.error(`  ! Role "${ROLE_NAME}" not found — nothing to do.`);
    return;
  }
  if (role._count.categories > 0) {
    console.warn(
      `  ! Role "${ROLE_NAME}" already has ${role._count.categories} categories — skipping to avoid duplicates.`
    );
    return;
  }

  await db.kpiRole.update({
    where: { id: role.id },
    data: {
      categories: {
        create: CATEGORIES.map((c, ci) => ({
          name: c.name,
          weight: c.weight,
          order: ci,
          metrics: { create: c.metrics.map((m, mi) => ({ description: m, order: mi })) }
        }))
      }
    }
  });

  const metricCount = CATEGORIES.reduce((s, c) => s + c.metrics.length, 0);
  console.log(
    `  + Created ${CATEGORIES.length} categories / ${metricCount} metrics (weight sum ${totalWeight}%)`
  );
  console.log("Migration complete.");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
