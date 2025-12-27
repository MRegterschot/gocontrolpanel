"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDownIcon } from "lucide-react";
import * as React from "react";

interface DatetimePickerProps {
  value?: Date | null;
  onChange: (value: Date | null) => void;
  disabled?: boolean;
}

export function DatetimePicker({
  value,
  onChange,
  disabled,
}: DatetimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const date = value ? new Date(value) : undefined;

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!date) return;
    const [hours, minutes, seconds] = e.target.value.split(":").map(Number);
    const updated = new Date(date);
    updated.setHours(hours);
    updated.setMinutes(minutes);
    updated.setSeconds(seconds || 0);
    onChange(updated);
  };

  return (
    <div className="flex gap-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-32 justify-between font-normal"
            disabled={disabled}
          >
            {date ? date.toLocaleDateString() : "Select date"}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[9999]">
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            onSelect={(d) => {
              if (!d) return onChange(null);
              const updated = new Date(value || new Date());
              updated.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
              onChange(updated);
              setOpen(false);
            }}
            endMonth={new Date(2100, 12)}
          />
        </PopoverContent>
      </Popover>

      <Input
        type="time"
        step="1"
        value={
          date
            ? `${String(date.getHours()).padStart(2, "0")}:${String(
                date.getMinutes(),
              ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`
            : ""
        }
        disabled={disabled}
        onChange={handleTimeChange}
      />
    </div>
  );
}
