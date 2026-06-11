"use client";

import * as React from "react";
import { CalendarIcon, XIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  date: Date | undefined;
  setDate: (value: Date | undefined) => void;
  placeholder?: string;
  /** Earliest selectable year in the dropdown. Defaults to 1980. */
  fromYear?: number;
};

export function DatePicker({ date, setDate, placeholder = "Pick a date", fromYear = 1980 }: Props) {
  const [isOpen, setIsOpen] = React.useState(false);
  const endYear = new Date().getFullYear();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd MMM yyyy") : <span>{placeholder}</span>}
          {date && (
            <XIcon
              className="text-muted-foreground hover:text-foreground ms-auto h-4 w-4"
              onClick={(e) => {
                e.stopPropagation();
                setDate(undefined);
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={new Date(fromYear, 0)}
          endMonth={new Date(endYear, 11)}
          selected={date}
          defaultMonth={date}
          onSelect={(d) => {
            setDate(d);
            setIsOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
