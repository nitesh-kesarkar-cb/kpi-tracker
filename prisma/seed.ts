import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

const db = new PrismaClient();

const DATA_DIR = path.join(process.cwd(), "data");
const DEFAULT_PASSWORD = "Codeblaze@2026";

// ---------- minimal RFC4180 CSV parser ----------
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // ignore
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

type ParsedMetric = { description: string; target?: string; order: number };
type ParsedCategory = { name: string; weight: number; order: number; metrics: ParsedMetric[] };
type ParsedRole = { name: string; experience?: string; categories: ParsedCategory[] };

function roleNameFromFile(file: string): string {
  const m = file.match(/\(([^)]+)\)/);
  return (m ? m[1] : file).trim();
}

function parseKpiCsv(file: string): ParsedRole {
  let text = fs.readFileSync(path.join(DATA_DIR, file), "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const rows = parseCsv(text);
  const role: ParsedRole = { name: roleNameFromFile(file), categories: [] };

  let currentCat: ParsedCategory | null = null;
  let catOrder = 0;

  for (const r of rows) {
    const designation = (r[0] ?? "").trim();
    const experience = (r[1] ?? "").trim();
    const catCell = (r[2] ?? "").trim();
    const descCell = (r[3] ?? "").trim();

    // header row
    if (designation.toLowerCase().startsWith("designation")) continue;
    // designation/experience row
    if (experience && !role.experience && experience.toLowerCase() !== "experience") {
      role.experience = experience;
    }

    if (catCell) {
      const weightMatch = catCell.match(/\((\d+)\s*%\)/);
      const weight = weightMatch ? parseInt(weightMatch[1], 10) : 0;
      const name = catCell.replace(/\(\s*\d+\s*%\s*\)/, "").trim();
      currentCat = { name, weight, order: catOrder++, metrics: [] };
      role.categories.push(currentCat);
    }

    if (descCell && currentCat) {
      if (/^target\b/i.test(descCell)) {
        const targetText = descCell.replace(/^target\s*:?\s*/i, "").trim();
        const last = currentCat.metrics[currentCat.metrics.length - 1];
        if (last) last.target = targetText;
        else
          currentCat.metrics.push({
            description: descCell,
            order: currentCat.metrics.length
          });
      } else {
        currentCat.metrics.push({
          description: descCell,
          order: currentCat.metrics.length
        });
      }
    }
  }

  return role;
}

// ---------- employee roster ----------
type EmpRow = { employeeId: string; firstName: string; lastName: string; jobTitle: string };

function parseEmployees(): EmpRow[] {
  const text = fs.readFileSync(path.join(DATA_DIR, "employees.txt"), "utf8");
  const lines = text.split("\n").map((l) => l.replace(/\r$/, "")).filter(Boolean);
  const out: EmpRow[] = [];
  for (const line of lines) {
    const cols = line.split("\t");
    if (cols[0].toLowerCase().startsWith("employee")) continue; // header
    out.push({
      employeeId: cols[0].trim(),
      firstName: (cols[1] ?? "").trim(),
      lastName: (cols[2] ?? "").trim(),
      jobTitle: (cols[3] ?? "").trim()
    });
  }
  return out;
}

// KPI roles with no Master_Sheet CSV — defined inline here (categories + metrics).
// House style: every role opens with the shared AI Adoption category (25%),
// then role-specific categories filling the remaining 75% (weights sum to 100%).
type ExtraCategory = { name: string; weight: number; metrics: string[] };
type ExtraRole = { name: string; experience?: string; categories: ExtraCategory[] };

// Shared first category, identical across all roles (mirrors the CSV roles).
const AI_ADOPTION: ExtraCategory = {
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

const EXTRA_KPI_ROLES: ExtraRole[] = [
  {
    name: "Accounts Executive",
    experience: "2-4 Years",
    categories: [
      AI_ADOPTION,
      {
        name: "Financial Accuracy & Compliance",
        weight: 25,
        metrics: [
          "Timely and accurate invoicing & bookkeeping",
          "Ledger reconciliation accuracy",
          "Compliance with tax/VAT filing deadlines",
          "Zero material errors in books of accounts",
          "Audit-ready documentation maintained"
        ]
      },
      {
        name: "Receivables & Payables",
        weight: 20,
        metrics: [
          "Days Sales Outstanding (DSO) within target",
          "Timely vendor payments",
          "Proactive follow-up on overdue receivables",
          "Accurate cash-flow reporting"
        ]
      },
      {
        name: "Reporting & Process",
        weight: 15,
        metrics: [
          "Monthly closing completed within timeline",
          "Accurate MIS / financial reports",
          "Adherence to financial controls & process"
        ]
      },
      {
        name: "Collaboration & Communication",
        weight: 15,
        metrics: [
          "Clear coordination with vendors and clients",
          "Responsiveness to internal queries",
          "Constructive cross-team support"
        ]
      }
    ]
  },
  {
    name: "IT Support",
    experience: "1-3 Years",
    categories: [
      AI_ADOPTION,
      {
        name: "Incident Resolution & Support",
        weight: 30,
        metrics: [
          "First-response within SLA",
          "Ticket resolution turnaround time",
          "Low ticket reopen rate",
          "Accurate root-cause logging",
          "User satisfaction on closed tickets"
        ]
      },
      {
        name: "System Uptime & Maintenance",
        weight: 20,
        metrics: [
          "Asset & inventory accuracy",
          "Preventive maintenance completion",
          "Backup & patch compliance",
          "Minimal unplanned downtime"
        ]
      },
      {
        name: "Security & Compliance",
        weight: 15,
        metrics: [
          "Access-control hygiene",
          "Endpoint security compliance",
          "Adherence to IT policy"
        ]
      },
      {
        name: "Collaboration & Documentation",
        weight: 10,
        metrics: [
          "Clear runbooks / knowledge-base articles",
          "Responsive cross-team support",
          "Knowledge sharing with the team"
        ]
      }
    ]
  },
  {
    name: "Data Analyst",
    experience: "2-4 Years",
    categories: [
      AI_ADOPTION,
      {
        name: "Data Quality & Accuracy",
        weight: 25,
        metrics: [
          "Accuracy of reports and dashboards",
          "Data validation & cleansing rigor",
          "Low error / rework rate",
          "Source-data integrity checks"
        ]
      },
      {
        name: "Analysis & Insights",
        weight: 20,
        metrics: [
          "Actionable insights delivered",
          "Timeliness of analysis",
          "Relevance to business questions",
          "Clear, accurate visualization"
        ]
      },
      {
        name: "Tooling & Querying",
        weight: 15,
        metrics: [
          "SQL / query efficiency",
          "Reusable queries & datasets",
          "Dashboard maintainability"
        ]
      },
      {
        name: "Collaboration & Communication",
        weight: 15,
        metrics: [
          "Clear presentation of findings",
          "Stakeholder requirement gathering",
          "Documentation of methodology"
        ]
      }
    ]
  },
  {
    name: "Senior Data Analyst",
    experience: "5+ Years",
    categories: [
      AI_ADOPTION,
      {
        name: "Advanced Analysis & Modeling",
        weight: 25,
        metrics: [
          "Predictive / statistical analysis depth",
          "Complex problem solving",
          "Hypothesis-driven approach",
          "Measurable business impact of insights"
        ]
      },
      {
        name: "Data Quality & Governance",
        weight: 15,
        metrics: [
          "Data accuracy & integrity",
          "Defines validation standards",
          "Documentation & data lineage"
        ]
      },
      {
        name: "Mentorship & Leadership",
        weight: 15,
        metrics: [
          "Guides and reviews junior analysts",
          "Drives analytics best practices",
          "Raises team capability"
        ]
      },
      {
        name: "Stakeholder & Strategy",
        weight: 20,
        metrics: [
          "Translates business needs into analytics",
          "Influences decisions with data",
          "Proactive insight generation",
          "Clear executive communication"
        ]
      }
    ]
  },
  {
    name: "HR Head",
    experience: "8+ Years",
    categories: [
      AI_ADOPTION,
      {
        name: "Talent Acquisition & Retention",
        weight: 20,
        metrics: [
          "Time-to-hire within target",
          "Quality of hire",
          "Attrition within target",
          "Offer acceptance rate"
        ]
      },
      {
        name: "Employee Engagement & Culture",
        weight: 20,
        metrics: [
          "Engagement survey scores",
          "Grievance resolution turnaround",
          "Engagement initiatives delivered"
        ]
      },
      {
        name: "HR Operations & Compliance",
        weight: 15,
        metrics: [
          "Payroll accuracy & timeliness",
          "Statutory / labor-law compliance",
          "Accurate HR records & policy adherence"
        ]
      },
      {
        name: "L&D & Performance",
        weight: 10,
        metrics: [
          "Training plan execution",
          "Performance-cycle completion",
          "Succession planning"
        ]
      },
      {
        name: "Strategy & Leadership",
        weight: 10,
        metrics: [
          "HR strategy aligned to business",
          "Leadership on org initiatives",
          "Data-driven HR decisions"
        ]
      }
    ]
  },
  {
    name: "General Manager",
    experience: "10+ Years",
    categories: [
      AI_ADOPTION,
      {
        name: "Business & Financial Performance",
        weight: 25,
        metrics: [
          "Revenue / target achievement",
          "Budget & cost control",
          "Profitability / margin",
          "P&L ownership"
        ]
      },
      {
        name: "Operational Excellence",
        weight: 20,
        metrics: [
          "Delivery / SLA across teams",
          "Process efficiency improvements",
          "Resource utilization"
        ]
      },
      {
        name: "People & Leadership",
        weight: 15,
        metrics: [
          "Team development & retention",
          "Cross-functional alignment",
          "Leadership effectiveness"
        ]
      },
      {
        name: "Strategy & Growth",
        weight: 15,
        metrics: [
          "Strategic initiatives delivered",
          "Client / stakeholder satisfaction",
          "Market / growth contribution"
        ]
      }
    ]
  }
];

// employeeId -> KPI role template name (best effort; admin can override in-app)
const KPI_ROLE_BY_EMP: Record<string, string> = {
  PW1223: "Engineering Manager", // Line Manager - Mobile
  PW1270: "Software Engineer-1", // Backend C#
  PW1907: "Software Engineer-2", // Sr Front End
  PW1911: "Software Engineer-1", // Backend C#
  PW1894: "Software Engineer-1", // Mobile App Dev
  PW1206: "Engineering Manager", // Line Manager .NET/C#
  PW1895: "Engineering Manager", // Technical Project Manager
  PW1902: "Software Engineer-1", // Front End
  PW1900: "Software Engineer-1", // Front End
  PW11988: "Engineering Manager", // GM & HR Head (super admin)
  PW1201: "Software Engineer-1", // Front End
  PW1203: "Engineering Manager", // Line Manager Front End (super admin)
  PW1252: "Tech Lead SD-3", // Team Lead Backend
  PW1910: "Junior Developer", // Jr Backend
  PW1287: "Software Engineer-2", // Sr Front End
  PW1897: "QA Analyst",
  PW11993: "QA Analyst",
  PW11992: "QA Analyst",
  PW1291: "Software Engineer-1", // Nodejs
  PW1268: "Software Engineer-1", // Vikram Bhimannavar (Front End)
  PW1899: "Accounts Executive", // Sagar Patil
  PW1190: "IT Support", // Sofiyan Pathan
  PW1221: "Data Analyst", // Bhushan Sonawane
  PW1241: "Senior Data Analyst" // Pritthish Chattopadhyay (Senior Data Scientist)
  // HR Head + General Manager roles created but left unassigned (Neha keeps Engineering Manager)
};

const SUPER_ADMINS = new Set(["PW1203", "PW11988"]);

// employeeId -> managerId (employeeId of manager); best effort
const MANAGER_BY_EMP: Record<string, string> = {
  // Front-end devs -> Nitesh (Line Manager FE)
  PW1902: "PW1203",
  PW1900: "PW1203",
  PW1201: "PW1203",
  PW1268: "PW1203",
  PW1907: "PW1203",
  PW1287: "PW1203",
  // Backend devs -> Pawan (Team Lead Backend)
  PW1270: "PW1252",
  PW1911: "PW1252",
  PW1910: "PW1252",
  PW1291: "PW1252",
  PW1252: "PW1206", // Pawan -> Imran
  // Mobile -> Amol
  PW1894: "PW1223",
  // QA + data/others -> Makarand (Technical PM)
  PW1897: "PW1895",
  PW11993: "PW1895",
  PW11992: "PW1895",
  PW1221: "PW1895",
  PW1241: "PW1895",
  // Managers & support -> Neha (GM)
  PW1223: "PW11988",
  PW1206: "PW11988",
  PW1895: "PW11988",
  PW1203: "PW11988",
  PW1899: "PW11988",
  PW1190: "PW11988"
};

function accessRoleFor(emp: EmpRow): string {
  if (SUPER_ADMINS.has(emp.employeeId)) return "SUPER_ADMIN";
  const t = emp.jobTitle.toLowerCase();
  if (t.includes("manager") || t.includes("lead") || t.includes("head")) return "MANAGER";
  return "EMPLOYEE";
}

async function main() {
  console.log("Seeding KPI Tracker...");

  // 0) Clear existing data so the seed is safe to re-run (cascades handle children).
  await db.metricScore.deleteMany();
  await db.review.deleteMany();
  await db.reviewCycle.deleteMany();
  await db.user.deleteMany();
  await db.kpiMetric.deleteMany();
  await db.kpiCategory.deleteMany();
  await db.kpiRole.deleteMany();

  // 1) KPI roles from CSVs
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("Master_Sheet") && f.endsWith(".csv"));

  const roleIdByName: Record<string, string> = {};
  for (const file of files) {
    const parsed = parseKpiCsv(file);
    const role = await db.kpiRole.create({
      data: {
        name: parsed.name,
        experience: parsed.experience,
        categories: {
          create: parsed.categories.map((c) => ({
            name: c.name,
            weight: c.weight,
            order: c.order,
            metrics: {
              create: c.metrics.map((m) => ({
                description: m.description,
                target: m.target,
                order: m.order
              }))
            }
          }))
        }
      }
    });
    roleIdByName[parsed.name] = role.id;
    const totalWeight = parsed.categories.reduce((s, c) => s + c.weight, 0);
    console.log(
      `  KPI role "${parsed.name}" — ${parsed.categories.length} categories, weight sum ${totalWeight}%`
    );
  }

  // 1b) Inline KPI roles (no CSV) — categories + metrics defined in EXTRA_KPI_ROLES.
  for (const r of EXTRA_KPI_ROLES) {
    if (roleIdByName[r.name]) continue; // a CSV already defined this name
    const role = await db.kpiRole.create({
      data: {
        name: r.name,
        experience: r.experience ?? null,
        categories: {
          create: r.categories.map((c, ci) => ({
            name: c.name,
            weight: c.weight,
            order: ci,
            metrics: {
              create: c.metrics.map((m, mi) => ({ description: m, order: mi }))
            }
          }))
        }
      }
    });
    roleIdByName[r.name] = role.id;
    const totalWeight = r.categories.reduce((s, c) => s + c.weight, 0);
    console.log(
      `  KPI role "${r.name}" — ${r.categories.length} categories, weight sum ${totalWeight}%`
    );
  }

  // 2) Employees
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const employees = parseEmployees();
  const userIdByEmp: Record<string, string> = {};

  for (const emp of employees) {
    const kpiRoleName = KPI_ROLE_BY_EMP[emp.employeeId];
    const kpiRoleId = kpiRoleName ? roleIdByName[kpiRoleName] : undefined;
    const email = `${emp.firstName}.${emp.lastName}@codeblaze.ae`.toLowerCase();
    const user = await db.user.create({
      data: {
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email,
        passwordHash,
        jobTitle: emp.jobTitle,
        accessRole: accessRoleFor(emp),
        mustChangePassword: true,
        kpiRoleId
      }
    });
    userIdByEmp[emp.employeeId] = user.id;
  }
  console.log(`  ${employees.length} employees seeded`);

  // 3) Manager links (second pass)
  for (const [empId, mgrEmpId] of Object.entries(MANAGER_BY_EMP)) {
    const uid = userIdByEmp[empId];
    const mid = userIdByEmp[mgrEmpId];
    if (uid && mid && uid !== mid) {
      await db.user.update({ where: { id: uid }, data: { managerId: mid } });
    }
  }

  // 4) Mid-Year 2026 cycle (OPEN) + generate reviews for employees with a KPI role
  const cycle = await db.reviewCycle.create({
    data: {
      name: "Mid-Year Review 2026",
      type: "MID_YEAR",
      year: 2026,
      status: "OPEN",
      opensAt: new Date("2026-06-01"),
      closesAt: new Date("2026-06-30")
    }
  });

  const usersWithRole = await db.user.findMany({
    where: { kpiRoleId: { not: null }, isActive: true },
    include: {
      kpiRole: { include: { categories: { include: { metrics: true } } } }
    }
  });

  for (const u of usersWithRole) {
    if (!u.kpiRole) continue;
    const metricRows: any[] = [];
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
        cycleId: cycle.id,
        employeeId: u.id,
        managerId: u.managerId,
        status: "NOT_STARTED",
        metricScores: { create: metricRows }
      }
    });
  }
  console.log(`  Cycle "${cycle.name}" with ${usersWithRole.length} reviews generated`);

  console.log("Seed complete.");
  console.log(`Login with any employee email / password: ${DEFAULT_PASSWORD}`);
  console.log("Super admins: Nitesh.Kesarkar@codeblaze.ae, Neha.Nagare@codeblaze.ae");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
