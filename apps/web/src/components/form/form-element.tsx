import { IconInfoCircle, IconX } from "@tabler/icons-react";
import clsx from "clsx";
import { Path, useFormContext } from "react-hook-form";
import { Button } from "../ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import type { SearchHandler } from "../ui/search-input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import RenderInput from "./render-input";

interface FormElementProps<TControl> {
  name: Path<TControl>;
  label?: string;
  description?: string;
  // Extra explanation behind an info icon next to the label
  tooltip?: string;
  placeholder?: string;
  type?: string;
  options?: {
    label: string;
    value: string;
    removable?: boolean;
    parseTmTags?: boolean;
  }[];
  defaultValues?: string[];
  isRequired?: boolean;
  isDisabled?: boolean;
  isHidden?: boolean;
  isLoading?: boolean;
  autoFocus?: boolean;
  step?: number;
  min?: number;
  max?: number;
  onSearch?: SearchHandler;
  onClear?: () => void;
  className?: string;
  rootClassName?: string;
  children?: React.ReactNode;
}

export default function FormElement<TControl>({
  name,
  label,
  description,
  tooltip,
  placeholder,
  type = "text",
  options,
  defaultValues,
  isRequired = false,
  isDisabled = false,
  isHidden = false,
  isLoading = false,
  autoFocus = false,
  step,
  min,
  max,
  onSearch,
  onClear,
  className,
  rootClassName,
  children,
}: FormElementProps<TControl>) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  if (isHidden) return null;

  const getNestedError = (errors: any, path: string) => {
    return path.split(".").reduce((acc, key) => acc?.[key], errors);
  };

  const error = getNestedError(errors, name);

  const getErrorMessage = (error: any): string | undefined => {
    if (!error) return undefined;

    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }

    return Array.isArray(error)
      ? error
          .map((e) => e?.message)
          .filter(Boolean)
          .join(", ")
      : undefined;
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={clsx("max-w-92", rootClassName)}>
          {(label || description) && (
            <div>
              {label && (
                <FormLabel
                  className="text-sm flex items-center"
                  data-error={!!error}
                >
                  {label}{" "}
                  {tooltip && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={`About ${label}`}
                          className="mx-1 text-muted-foreground hover:text-foreground"
                        >
                          <IconInfoCircle size={14} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64">
                        {tooltip}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {isRequired && (
                    <span
                      data-error={!!error}
                      className="text-xs text-muted-foreground data-[error=true]:text-destructive"
                    >
                      (Required)
                    </span>
                  )}
                </FormLabel>
              )}
              {description && <FormDescription>{description}</FormDescription>}
            </div>
          )}
          <FormControl>
            <div className="flex gap-2">
              <RenderInput
                field={field}
                type={type}
                name={name}
                label={label}
                placeholder={placeholder}
                options={options}
                defaultValues={defaultValues}
                isDisabled={isDisabled || (type !== "search" && isLoading)}
                isLoading={isLoading}
                step={step}
                min={min}
                max={max}
                onSearch={onSearch}
                error={error}
                autoFocus={autoFocus}
                className={className}
              />

              {onClear && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClear}
                >
                  <IconX />
                </Button>
              )}

              {children}
            </div>
          </FormControl>
          {error && (
            <FormMessage className="text-destructive text-xs">
              {getErrorMessage(error)}
            </FormMessage>
          )}
        </FormItem>
      )}
    />
  );
}
