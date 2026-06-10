# Codeblaze KPI Tracker

Internal performance-review platform. Employees view their role KPIs, complete mid-year & year-end
self-reviews; managers rate and finalize; super-admins manage everything and run reports.

Single Next.js app (FE + BE). Built on the premium shadcn/ui dashboard template — the original demo
template is preserved untouched in [`reference/`](./reference) for component reference.

## Stack
- Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind v4 · shadcn/ui
- Prisma + PostgreSQL · Auth.js (credentials) · Recharts

## Getting started
```bash
cp .env.example .env   # fill in DATABASE_URL + AUTH_SECRET (a Postgres DB, e.g. Neon)
pnpm install
pnpm db:push           # sync schema to the database
pnpm db:seed           # seed roles, employees, mid-year 2026 cycle
pnpm dev               # http://localhost:3000
```

> Need a free Postgres? Create one at [neon.tech](https://neon.tech) and paste its connection
> string into `DATABASE_URL`. Generate `AUTH_SECRET` with `openssl rand -base64 32`.

### Seeded logins
All 24 employees from `data/employees.txt`, email = `first.last@codeblaze.ae`,
password = `Codeblaze@2026` (forced change on first login).

- **Super admins:** `nitesh.kesarkar@codeblaze.ae`, `neha.nagare@codeblaze.ae`
- **Managers:** anyone whose job title contains Manager / Lead / Head
- **Everyone else:** employee

## Roles & access
| Role | Can |
|------|-----|
| Employee | View own KPIs, complete self-reviews, give company feedback |
| Manager | All of the above + rate/finalize direct reports' reviews |
| Super admin | Manage employees, roles, KPIs, cycles, feedback, reports |

Data isolation is enforced server-side in every query/action (`lib/auth-guards.ts`) and at the
edge in `proxy.ts` (middleware) — no one can read another person's review.

## How it works
- **KPI templates** (`KpiRole` → `KpiCategory` w/ weight % → `KpiMetric`) seeded from the master
  CSVs in `data/`. Admins edit them under **Manage KPIs**.
- **Employees** are assigned a KPI role + manager (best-effort at seed; editable under
  **Admin → Employees**). Job titles in the roster don't map 1:1 to templates, so confirm
  assignments in-app.
- **Review cycles** (mid-year / year-end) are created and opened by admins. "Generate reviews"
  snapshots each assigned employee's KPI tree into a `Review` with one `MetricScore` per metric.
- **Scoring:** each metric is rated 1–5 (self + manager). Category score = avg of its metrics;
  overall % = Σ(categoryScore/5 × weight), renormalized over rated categories (`lib/scoring.ts`).
- **Reports:** completion %, avg final score, score-by-role bar chart, status pie, CSV export.

## Deploying to Vercel
Single app — no separate backend. Frontend, server actions, and API routes deploy together.

1. Import this repo in Vercel.
2. Add a Postgres database (Vercel Storage → Neon, or paste your own).
3. Set env vars: `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_TRUST_HOST=true`.
4. Deploy. Then sync schema + seed once against the production DB:
   ```bash
   vercel env pull .env.production.local   # pull DATABASE_URL
   DATABASE_URL="<prod-url>" pnpm db:push
   DATABASE_URL="<prod-url>" pnpm db:seed
   ```

## Key paths
- `prisma/schema.prisma`, `prisma/seed.ts` — data model + seeding
- `auth.ts`, `auth.config.ts`, `proxy.ts` — authentication & gating
- `lib/auth-guards.ts`, `lib/queries.ts`, `lib/scoring.ts` — server helpers
- `app/(app)/**` — the application (dashboard, my-kpis, reviews, team, admin)
- `components/kpi/**` — KPI-specific UI
