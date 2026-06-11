"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboardIcon,
  TargetIcon,
  ClipboardListIcon,
  UsersIcon,
  UserCogIcon,
  LayersIcon,
  GaugeIcon,
  CalendarRangeIcon,
  MessageSquareTextIcon,
  BarChart3Icon,
  ScrollTextIcon,
  LogOutIcon,
  type LucideIcon
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Logo from "@/components/layout/logo";
import { getInitials } from "@/lib/utils";

type NavItem = { title: string; href: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

export type SidebarUser = { name: string; email: string; accessRole: string };

function buildNav(role: string): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: "Me",
      items: [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
        { title: "My KPIs", href: "/my-kpis", icon: TargetIcon },
        { title: "My Reviews", href: "/reviews", icon: ClipboardListIcon }
      ]
    }
  ];

  if (role === "MANAGER" || role === "SUPER_ADMIN") {
    groups.push({
      label: "Manager",
      items: [{ title: "My Team", href: "/team", icon: UsersIcon }]
    });
  }

  if (role === "SUPER_ADMIN") {
    groups.push({
      label: "Administration",
      items: [
        { title: "Employees", href: "/admin/employees", icon: UserCogIcon },
        { title: "Roles", href: "/admin/roles", icon: LayersIcon },
        { title: "Manage KPIs", href: "/admin/kpis", icon: GaugeIcon },
        { title: "Review Cycles", href: "/admin/cycles", icon: CalendarRangeIcon },
        { title: "Feedback", href: "/admin/feedback", icon: MessageSquareTextIcon },
        { title: "Reports", href: "/admin/reports", icon: BarChart3Icon },
        { title: "Audit Log", href: "/admin/audit", icon: ScrollTextIcon }
      ]
    });
  }

  return groups;
}

export function KpiSidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const nav = buildNav(user.accessRole);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-10 group-data-[collapsible=icon]:px-0!">
              <Link href="/dashboard">
                <Logo />
                <span className="text-foreground font-semibold">KPI Tracker</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {nav.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="group-data-[collapsible=icon]:px-0!">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOutIcon />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
