import * as React from "react";

import { cn } from "@/lib/utils";
import { formControlVariants } from "./form-control";

interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean;
}

function Input({ className, type, error, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        formControlVariants(),
        "file:text-foreground flex w-full min-w-0 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
        error && "border-destructive focus-visible:ring-destructive/40",
      )}
      {...props}
      aria-invalid={props["aria-invalid"] ?? (error || undefined)}
      {...(type !== "file" && props.value !== undefined
        ? { value: props.value ?? "" }
        : {})}
    />
  );
}

export { Input };
