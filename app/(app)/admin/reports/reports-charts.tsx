"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

export function ReportsCharts({
  byRole,
  statusBreakdown
}: {
  byRole: { role: string; score: number }[];
  statusBreakdown: { name: string; value: number }[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Average final score by role</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {byRole.length === 0 ? (
            <p className="text-muted-foreground text-sm">No finalized reviews yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byRole} margin={{ left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="role"
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={60}
                  fontSize={11}
                />
                <YAxis domain={[0, 100]} fontSize={11} />
                <Tooltip formatter={(v: number) => `${v.toFixed(0)}%`} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review status breakdown</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(e: any) => `${e.name}: ${e.value}`}>
                {statusBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
