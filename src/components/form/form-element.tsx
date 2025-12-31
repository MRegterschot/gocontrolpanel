import { IconHelp } from "@tabler/icons-react";
import clsx from "clsx";
import { Path, useFormContext } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import RenderInput from "./render-input";

interface FormElementProps<TControl> {
  name: Path<TControl>;
  label?: string;
  description?: string;
  placeholder?: string;
  type?: string;
  options?: { label: string; value: string; removable?: boolean }[];
  defaultValues?: string[];
  isRequired?: boolean;
  isDisabled?: boolean;
  isHidden?: boolean;
  isLoading?: boolean;
  autoFocus?: boolean;
  step?: number;
  min?: number;
  max?: number;
  onSearch?: (query?: string) => void;
  tooltip?: string;
  className?: string;
  rootClassName?: string;
  children?: React.ReactNode;
}

export default function FormElement<TControl>({
  name,
  label,
  description,
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
  tooltip,
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
                  {isRequired && (
                    <span
                      data-error={!!error}
                      className="text-xs text-muted-foreground data-[error=true]:text-destructive"
                    >
                      (Required)
                    </span>
                  )}
                  {tooltip && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconHelp size={16} />
                      </TooltipTrigger>
                      <TooltipContent>
                        {tooltip}
                      </TooltipContent>
                    </Tooltip>
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
                isDisabled={isDisabled || isLoading}
                isLoading={isLoading}
                step={step}
                min={min}
                max={max}
                onSearch={onSearch}
                error={error}
                autoFocus={autoFocus}
                className={className}
              />
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
