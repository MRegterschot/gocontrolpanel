import { cva } from "class-variance-authority";

// Shared appearance for inputs, textareas and selection controls.
export const formControlVariants = cva(
  "border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      size: {
        default: "h-9",
        sm: "h-8",
        auto: "min-h-9",
      },
    },
    defaultVariants: { size: "default" },
  },
);
