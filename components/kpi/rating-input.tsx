"use client";

import { cn } from "@/lib/utils";

const SCALE = [1, 2, 3, 4, 5];

export function RatingInput({
  value,
  onChange,
  disabled,
  name
}: {
  value: number | null;
  onChange?: (v: number) => void;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={name}>
      {SCALE.map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            aria-checked={active}
            role="radio"
            onClick={() => onChange?.(n)}
            className={cn(
              "size-9 rounded-md border text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input hover:bg-accent",
              disabled && "cursor-not-allowed opacity-60"
            )}>
            {n}
          </button>
        );
      })}
    </div>
  );
}
