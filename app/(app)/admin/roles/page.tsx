import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { RolesManager, type RoleRow } from "./roles-manager";

export const metadata = { title: "Roles — Admin" };

export default async function AdminRolesPage() {
  await requireAdmin();
  const roles = await db.kpiRole.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { categories: true, users: true } } }
  });

  const rows: RoleRow[] = roles.map((r) => ({
    id: r.id,
    name: r.name,
    experience: r.experience,
    categoryCount: r._count.categories,
    userCount: r._count.users
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Roles &amp; Designations</h1>
        <p className="text-muted-foreground">KPI templates assigned to employees.</p>
      </div>
      <RolesManager roles={rows} />
    </div>
  );
}
