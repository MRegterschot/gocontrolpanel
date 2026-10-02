import clsx from "clsx";
import { Search } from "lucide-react";
import React from "react";
import { Input } from "./input";
import { Popover, PopoverAnchor, PopoverContent } from "./popover"; // Don't use PopoverTrigger

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string;
  defaultValue?: string;
  onSearch?: (query?: string) => void;
  onValueChange: (value: string) => void;
  searchResults: { label: string; value: string }[];
  loading?: boolean;
  className?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      defaultValue = "",
      onSearch,
      onValueChange,
      searchResults,
      loading = false,
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
      const match = searchResults.find((r) => r.value === value);
      return match?.label ?? value;
    }, [value, searchResults]);

    const displayValue = isControlled ? selectedLabel : rawInput;

    const handleEnterKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    };

    const handleSearch = () => {
      onSearch?.(isControlled ? value : rawInput);
      setIsPopoverOpen(true);
    };

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
          <div className="relative w-full">
            <Input
              ref={ref}
              value={displayValue}
              onChange={(e) => {
                if (!isControlled) {
                  setRawInput(e.target.value);
                }
                onValueChange(e.target.value);
              }}
              type="text"
              onKeyDown={handleEnterKey}
              placeholder={placeholder || "Search..."}
              className={clsx("w-full pr-10 text-sm", className)}
              {...props}
            />
            <Search
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
              onClick={handleSearch}
              role="button"
            />
          </div>
        </PopoverAnchor>

        <PopoverContent align="start" className="w-auto p-1 z-[9999]">
          {loading ? (
            <div className="p-2 text-sm px-2 py-1 ">Searching...</div>
          ) : (isControlled ? !value : !rawInput) ||
            searchResults.filter((r) =>
              r.label
                .toLowerCase()
                .includes((isControlled ? value : rawInput).toLowerCase()),
            ).length === 0 ? (
            <div className="p-2 text-sm px-2 py-1 ">No results found</div>
          ) : (
            searchResults
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

SearchInput.displayName = "SearchInput";
