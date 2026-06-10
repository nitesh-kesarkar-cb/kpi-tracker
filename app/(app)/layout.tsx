import React from "react";
import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { KpiSidebar } from "@/components/kpi/kpi-sidebar";
import { KpiHeader } from "@/components/kpi/kpi-header";
import { requireUser } from "@/lib/auth-guards";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const cookieStore = await cookies();
  const defaultOpen =
    cookieStore.get("sidebar_state")?.value === "true" ||
    cookieStore.get("sidebar_state") === undefined;

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 14)",
          "--content-padding": "calc(var(--spacing) * 4)",
          "--content-margin": "calc(var(--spacing) * 1.5)"
        } as React.CSSProperties
      }>
      <KpiSidebar user={{ name: user.name, email: user.email, accessRole: user.accessRole }} />
      <SidebarInset>
        <KpiHeader accessRole={user.accessRole} />
        <div className="bg-muted/40 flex flex-1 flex-col">
          <div className="@container/main p-(--content-padding)">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
