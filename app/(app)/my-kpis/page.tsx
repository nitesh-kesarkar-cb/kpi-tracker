import { requireUser } from "@/lib/auth-guards";
import { getUserWithKpi } from "@/lib/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { TargetIcon } from "lucide-react";

export const metadata = { title: "My KPIs — KPI Tracker" };

export default async function MyKpisPage() {
  const sessionUser = await requireUser();
  const user = await getUserWithKpi(sessionUser.id);

  if (!user?.kpiRole) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center">
            <TargetIcon className="size-8" />
            <p>
              No KPI role has been assigned to your account yet. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { kpiRole } = user;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My KPIs</h1>
        <p className="text-muted-foreground">
          {kpiRole.name}
          {kpiRole.experience ? ` · ${kpiRole.experience}` : ""}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kpiRole.categories.map((c) => (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="line-clamp-2">{c.name}</CardDescription>
                <Badge>{c.weight}%</Badge>
              </div>
              <CardTitle className="text-sm font-normal">
                {c.metrics.length} metric{c.metrics.length === 1 ? "" : "s"}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Accordion type="multiple" className="space-y-3">
        {kpiRole.categories.map((c) => (
          <Card key={c.id} className="overflow-hidden py-0">
            <AccordionItem value={c.id} className="border-0">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex w-full items-center justify-between pr-2">
                  <span className="font-medium">{c.name}</span>
                  <Badge variant="outline">{c.weight}%</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <ul className="space-y-3">
                  {c.metrics.map((m) => (
                    <li key={m.id} className="border-l-2 pl-3 text-sm">
                      <p>{m.description}</p>
                      {m.target && (
                        <p className="text-muted-foreground mt-0.5 text-xs">Target: {m.target}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Card>
        ))}
      </Accordion>
    </div>
  );
}
