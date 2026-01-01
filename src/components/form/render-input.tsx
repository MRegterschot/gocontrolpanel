"use client";
import { cn } from "@/lib/utils";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useState } from "react";
import {
  ControllerRenderProps,
  FieldError,
  FieldErrorsImpl,
  FieldValues,
  Merge,
} from "react-hook-form";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { DatetimePicker } from "../ui/datetime-picker";
import { Input } from "../ui/input";
import { MultiSelect } from "../ui/multi-select";
import { SearchInput } from "../ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

interface RenderInputProps<TControl extends FieldValues> {
  field: ControllerRenderProps<TControl>;
  type?: string;
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  options?: { label: string; value: string; removable?: boolean }[];
  defaultValues?: string[];
  isRequired?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  autoFocus?: boolean;
  step?: number;
  min?: number;
  max?: number;
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;
  onSearch?: (query?: string) => void;
  className?: string;
}

export default function RenderInput<TControl extends FieldValues>({
  field,
  type,
  name,
  label,
  placeholder,
  options,
  defaultValues,
  isDisabled = false,
  isLoading = false,
  autoFocus = false,
  step,
  min,
  max,
  error,
  onSearch,
  className,
}: RenderInputProps<TControl & FieldValues>) {
  const [showPassword, setShowPassword] = useState(false);

  switch (type) {
    case "text":
    case "number":
      return (
        <Input
          type={type}
          placeholder={placeholder}
          disabled={isDisabled || isLoading}
          {...field}
          onChange={(e) =>
            type === "number"
              ? field.onChange(e.target.value ? e.target.valueAsNumber : "")
              : field.onChange(e.target.value)
          }
          className={className}
          error={!!error}
          step={step}
          min={min}
          max={max}
          autoFocus={autoFocus}
        />
      );
    case "password":
      return (
        <div className={cn("relative w-full", className)}>
          <Input
            type={showPassword ? "text" : "password"}
            placeholder={placeholder}
            disabled={isDisabled || isLoading}
            {...field}
            className={"pr-10"}
            error={!!error}
            autoFocus={autoFocus}
          />
          <Button
            type="button"
            variant={null}
            className="absolute right-0 top-1/2 -translate-y-1/2"
            onClick={() => {
              setShowPassword((prev) => !prev);
            }}
          >
            {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
          </Button>
        </div>
      );
    case "select":
      return (
        <Select
          onValueChange={field.onChange}
          defaultValue={`${field.value}`}
          disabled={isDisabled || isLoading}
        >
          <SelectTrigger className={className}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="z-9999 max-w-[95vw]">
            {options?.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "checkbox":
      return (
        <div className={cn("flex items-center gap-2", className)}>
          <Checkbox
            id={name}
            disabled={isDisabled || isLoading}
            checked={field.value}
            onCheckedChange={field.onChange}
          />
          <label htmlFor={name} className="text-sm">
            {placeholder || label}
          </label>
        </div>
      );
    case "pair-list":
      return (
        <div className={cn("flex flex-col gap-2")}>
          {options?.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`${name}-${option.value}`}
                disabled={isDisabled || isLoading}
                checked={field.value.includes(option.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    field.onChange([...field.value, option.value]);
                  } else {
                    field.onChange(
                      field.value.filter(
                        (value: string) => value !== option.value,
                      ),
                    );
                  }
                }}
              />
              <label htmlFor={`${name}-${option.value}`} className="text-sm">
                {option.label}
              </label>
            </div>
          ))}
        </div>
      );
    case "multi-select":
      return (
        <MultiSelect
          options={options || []}
          value={field.value}
          originalValue={defaultValues}
          onValueChange={field.onChange}
          placeholder={placeholder}
          animation={2}
          maxCount={max || 3}
        />
      );
    case "search":
      return (
        <SearchInput
          onSearch={onSearch}
          value={field.value}
          onValueChange={field.onChange}
          searchResults={options || []}
          loading={isLoading}
          className={className}
          placeholder={placeholder}
        />
      );
    case "textarea":
      return (
        <Textarea
          placeholder={placeholder}
          disabled={isDisabled || isLoading}
          className={className}
          autoFocus={autoFocus}
          {...field}
        />
      );
    case "datetime":
      return (
        <DatetimePicker
          value={field.value}
          onChange={field.onChange}
          disabled={isDisabled || isLoading}
        />
      );
    case "array-number": {
      const [raw, setRaw] = useState(
        Array.isArray(field.value) ? field.value.join(",") : "",
      );

      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setRaw(value);

        const parsed = value
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v !== "" && !isNaN(Number(v)))
          .map(Number);

        field.onChange(parsed);
      };

      return (
        <Input
          type="text"
          placeholder={placeholder}
          disabled={isDisabled || isLoading}
          className={className}
          autoFocus={autoFocus}
          value={raw}
          onChange={handleChange}
        />
      );
    }
    default:
      return (
        <Input
          type={type}
          placeholder={placeholder}
          disabled={isDisabled || isLoading}
          {...field}
          error={!!error}
          className={className}
          autoFocus={autoFocus}
        />
      );
  }
}
