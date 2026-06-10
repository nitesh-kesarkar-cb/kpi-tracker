import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { KpiManager, type RoleTree } from "./kpi-manager";

export const metadata = { title: "Manage KPIs — Admin" };

export default async function AdminKpisPage({
  searchParams
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  await requireAdmin();
  const { role: roleId } = await searchParams;

  const roles = await db.kpiRole.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true }
  });

  let role: RoleTree | null = null;
  if (roleId) {
    const full = await db.kpiRole.findUnique({
      where: { id: roleId },
      include: {
        categories: {
          orderBy: { order: "asc" },
          include: { metrics: { orderBy: { order: "asc" } } }
        }
      }
    });
    if (full) {
      role = {
        id: full.id,
        name: full.name,
        categories: full.categories.map((c) => ({
          id: c.id,
          name: c.name,
          weight: c.weight,
          order: c.order,
          metrics: c.metrics.map((m) => ({
            id: m.id,
            description: m.description,
            target: m.target,
            order: m.order
          }))
        }))
      };
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Manage KPIs</h1>
        <p className="text-muted-foreground">
          Edit categories, weights, and metrics for each role.
        </p>
      </div>
      <KpiManager roles={roles} role={role} />
    </div>
  );
}
