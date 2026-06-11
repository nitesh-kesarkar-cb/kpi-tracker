import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { EmployeesTable, type EmployeeRow } from "./employees-table";

export const metadata = { title: "Employees — Admin" };

export default async function AdminEmployeesPage() {
  await requireAdmin();
  const [users, kpiRoles] = await Promise.all([
    db.user.findMany({ orderBy: { firstName: "asc" } }),
    db.kpiRole.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
  ]);

  const employees: EmployeeRow[] = users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    employeeId: u.employeeId,
    dateOfJoining: u.dateOfJoining ? u.dateOfJoining.toISOString() : null,
    careerStartDate: u.careerStartDate ? u.careerStartDate.toISOString() : null,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    jobTitle: u.jobTitle,
    accessRole: u.accessRole,
    kpiRoleId: u.kpiRoleId,
    managerId: u.managerId
  }));

  const managers = users
    .filter((u) => u.accessRole === "MANAGER" || u.accessRole === "SUPER_ADMIN")
    .map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Employees</h1>
        <p className="text-muted-foreground">
          Assign KPI roles, managers, and access levels. {employees.length} employees.
        </p>
      </div>
      <EmployeesTable employees={employees} kpiRoles={kpiRoles} managers={managers} />
    </div>
  );
}
