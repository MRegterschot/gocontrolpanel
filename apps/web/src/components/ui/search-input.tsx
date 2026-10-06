"use client";

import { cn } from "@/lib/utils";
import { Check, LoaderCircle, Search } from "lucide-react";
import React from "react";
import { Button } from "./button";
import { formControlVariants } from "./form-control";
import { Input } from "./input";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";

export interface SearchResult {
  label: string;
  value: string;
}

export type SearchHandler = (
  query?: string,
) => void | Promise<SearchResult[] | void>;

interface SearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  value?: string;
  defaultValue?: string;
  onSearch?: SearchHandler;
  onValueChange: (value: string) => void;
  searchResults: SearchResult[];
  loading?: boolean;
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
      disabled,
      onKeyDown,
      autoFocus,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const selectedValue = value ?? internalValue;
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<SearchResult[] | null>(null);
    const [completedQuery, setCompletedQuery] = React.useState<string | null>(
      null,
    );
    const [searching, setSearching] = React.useState(false);
    const [failed, setFailed] = React.useState(false);
    const [open, setOpen] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [focusInput, setFocusInput] = React.useState(false);
    const selected = React.useRef<SearchResult | null>(null);
    const changeButton = React.useRef<HTMLButtonElement>(null);
    const searchHandler = React.useRef(onSearch);
    const currentQuery = React.useRef(query);
    const request = React.useRef(0);
    const debounce = React.useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );
    const listId = React.useId();
    const hintId = React.useId();
    searchHandler.current = onSearch;

    const selectedLabel =
      searchResults.find((result) => result.value === selectedValue)?.label ??
      (selected.current?.value === selectedValue
        ? selected.current.label
        : selectedValue);
    const visibleResults =
      completedQuery === query
        ? (results ??
          searchResults.filter((result) =>
            [result.label, result.value].some((text) =>
              text.toLowerCase().includes(query.trim().toLowerCase()),
            ),
          ))
        : [];
    const pending =
      searching || (results === null && loading) || completedQuery !== query;

    const search = React.useCallback(async (text: string) => {
      clearTimeout(debounce.current);
      if (!text.trim()) return;
      const id = ++request.current;
      setSearching(true);
      setFailed(false);
      try {
        const found = await searchHandler.current?.(text.trim());
        if (id !== request.current || text !== currentQuery.current) return;
        setResults(found ?? null);
        setCompletedQuery(text);
        setActiveIndex(0);
      } catch {
        if (id !== request.current || text !== currentQuery.current) return;
        setResults([]);
        setCompletedQuery(text);
        setFailed(true);
      } finally {
        if (id === request.current) setSearching(false);
      }
    }, []);

    React.useEffect(() => {
      if (selectedValue || disabled || !query.trim()) return;
      debounce.current = setTimeout(() => void search(query), 400);
      return () => clearTimeout(debounce.current);
    }, [query, selectedValue, disabled, search]);

    React.useEffect(
      () => () => {
        ++request.current;
        clearTimeout(debounce.current);
      },
      [],
    );

    function changeValue(next: string) {
      setInternalValue(next);
      onValueChange(next);
    }

    function select(result: SearchResult) {
      ++request.current;
      clearTimeout(debounce.current);
      selected.current = result;
      setSearching(false);
      setOpen(false);
      setQuery("");
      currentQuery.current = "";
      changeValue(result.value);
      requestAnimationFrame(() => changeButton.current?.focus());
    }

    function edit(text: string) {
      ++request.current;
      currentQuery.current = text;
      setQuery(text);
      setResults(null);
      setCompletedQuery(null);
      setSearching(false);
      setFailed(false);
      setActiveIndex(0);
      setOpen(!!text.trim());
      // Only a clicked/keyboard-selected search result may become the form value.
      if (selectedValue) changeValue("");
    }

    if (selectedValue) {
      return (
        <div
          className={cn(
            formControlVariants(),
            "flex min-w-0 w-full items-center gap-2 bg-accent/40 py-0",
            className,
          )}
        >
          <Check
            className="size-4 shrink-0 text-green-600"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate" title={selectedLabel}>
            {selectedLabel}
          </span>
          <span className="text-xs text-muted-foreground">Selected</span>
          <Button
            ref={changeButton}
            type="button"
            disabled={disabled}
            aria-label={`Change selected user ${selectedLabel}`}
            variant="ghost"
            size="sm"
            className="px-2 text-xs"
            onClick={() => {
              setFocusInput(true);
              edit(selectedLabel ?? "");
            }}
          >
            Change
          </Button>
        </div>
      );
    }

    return (
      <div className="min-w-0 w-full">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverAnchor asChild>
            <div className="relative w-full">
              <Input
                {...props}
                ref={ref}
                value={query}
                disabled={disabled}
                autoFocus={autoFocus || focusInput}
                type="text"
                role="combobox"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls={
                  open && !pending && visibleResults.length ? listId : undefined
                }
                aria-activedescendant={
                  open && !pending && visibleResults[activeIndex]
                    ? `${listId}-${activeIndex}`
                    : undefined
                }
                aria-describedby={[props["aria-describedby"], hintId]
                  .filter(Boolean)
                  .join(" ")}
                placeholder={placeholder || "Search by name or login..."}
                className={cn("w-full pr-10 text-sm", className)}
                onChange={(event) => edit(event.target.value)}
                onFocus={() => {
                  if (query.trim()) setOpen(true);
                }}
                onKeyDown={(event) => {
                  onKeyDown?.(event);
                  if (event.defaultPrevented) return;
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (open && !pending && visibleResults[activeIndex])
                      select(visibleResults[activeIndex]);
                    else if (!searching && query.trim()) {
                      setOpen(true);
                      void search(query);
                    }
                  } else if (
                    event.key === "ArrowDown" ||
                    event.key === "ArrowUp"
                  ) {
                    event.preventDefault();
                    setOpen(!!query.trim());
                    if (visibleResults.length)
                      setActiveIndex(
                        (index) =>
                          (index +
                            (event.key === "ArrowDown" ? 1 : -1) +
                            visibleResults.length) %
                          visibleResults.length,
                      );
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    setOpen(false);
                  }
                }}
              />
              <Button
                type="button"
                aria-label="Search users"
                disabled={disabled || searching || !query.trim()}
                variant="ghost"
                size="icon-sm"
                className="absolute right-0.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setOpen(true);
                  void search(query);
                }}
              >
                {searching ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
              </Button>
            </div>
          </PopoverAnchor>
          <PopoverContent
            align="start"
            className="z-[9999] w-[var(--radix-popover-trigger-width)] min-w-64 p-1"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            {pending ? (
              <div role="status" className="p-2 text-sm text-muted-foreground">
                Searching...
              </div>
            ) : failed ? (
              <div role="status" className="p-2 text-sm">
                Search failed. Try again.
              </div>
            ) : !visibleResults.length ? (
              <div role="status" className="p-2 text-sm text-muted-foreground">
                No users found. Check the name or login.
              </div>
            ) : (
              <div role="listbox" id={listId} aria-label="User search results">
                {visibleResults.map((result, index) => (
                  <Button
                    key={result.value}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    type="button"
                    variant="ghost"
                    className={cn(
                      "w-full justify-between gap-3 px-2 text-left font-normal",
                      index === activeIndex && "bg-accent",
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(result)}
                  >
                    <span>{result.label}</span>
                    <span className="text-xs text-muted-foreground">
                      Select
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
        <p
          id={hintId}
          className="mt-1 text-xs text-muted-foreground"
          role="status"
        >
          {query
            ? "No user selected yet. Choose a search result."
            : "Type a name, then choose a search result."}
        </p>
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
