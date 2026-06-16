"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export function CycleSelect({
  cycles,
  current,
  basePath = "/admin/reports"
}: {
  cycles: { id: string; name: string }[];
  current: string;
  basePath?: string;
}) {
  const router = useRouter();
  return (
    <Select value={current} onValueChange={(v) => router.push(`${basePath}?cycle=${v}`)}>
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {cycles.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
