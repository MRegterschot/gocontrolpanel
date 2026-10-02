import clsx from "clsx";
import React from "react";
import { Input } from "./input";
import { Popover, PopoverAnchor, PopoverContent } from "./popover"; // Don't use PopoverTrigger

interface FilterInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string;
  defaultValue?: string;
  onValueChange: (value: string) => void;
  options: { label: string; value: string }[];
  className?: string;
}

export const FilterInput = React.forwardRef<HTMLInputElement, FilterInputProps>(
  (
    {
      value,
      defaultValue = "",
      onValueChange,
      options,
      className,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const isControlled = value !== undefined;
    const [rawInput, setRawInput] = React.useState(defaultValue);
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

    const selectedLabel = React.useMemo(() => {
      if (!isControlled) return undefined;
      const match = options.find((r) => r.value === value);
      return match?.label ?? value;
    }, [value, options]);

    const displayValue = isControlled ? selectedLabel : rawInput;

    const handleSelect = (item: { label: string; value: string }) => {
      setIsPopoverOpen(false);
      if (!isControlled) {
        setRawInput(item.label);
      }
      onValueChange?.(item.value);
    };

    return (
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverAnchor asChild>
          <div className={clsx("relative w-full", className)}>
            <Input
              ref={ref}
              value={displayValue}
              onChange={(e) => {
                if (!isControlled) {
                  setRawInput(e.target.value);
                }
                onValueChange(e.target.value);
              }}
              onFocus={() => setIsPopoverOpen(true)}
              type="text"
              placeholder={placeholder || "Search..."}
              className={"w-full pr-10 text-sm"}
              {...props}
            />
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          className="w-auto p-1 z-[9999]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {options.filter((r) =>
            r.label
              .toLowerCase()
              .includes((isControlled ? value : rawInput).toLowerCase()),
          ).length === 0 ? (
            <div className="p-2 text-sm px-2 py-1 ">No results found</div>
          ) : (
            options
              .filter((r) =>
                r.label
                  .toLowerCase()
                  .includes((isControlled ? value : rawInput).toLowerCase()),
              )
              .map((result) => (
                <div
                  key={result.value}
                  onClick={() => handleSelect(result)}
                  className="cursor-pointer px-2 py-1 text-sm hover:bg-accent"
                >
                  {result.label}
                </div>
              ))
          )}
        </PopoverContent>
      </Popover>
    );
  },
);

FilterInput.displayName = "FilterInput";
