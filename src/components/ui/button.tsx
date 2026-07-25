import { Slot } from "@radix-ui/react-slot";
import { cva, VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        sidebar:
          "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  collapse?: "sm" | "md" | "lg" | "xl";
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  collapse,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  const collapseClasses = collapse
    ? {
        sm: "aspect-square px-2 sm:aspect-auto sm:px-4",
        md: "aspect-square px-2 md:aspect-auto md:px-4",
        lg: "aspect-square px-2 lg:aspect-auto lg:px-4",
        xl: "aspect-square px-2 xl:aspect-auto xl:px-4",
      }[collapse]
    : "";

  const textClasses = collapse
    ? {
        sm: "hidden sm:inline",
        md: "hidden md:inline",
        lg: "hidden lg:inline",
        xl: "hidden xl:inline",
      }[collapse]
    : "";

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size }),
        collapseClasses,
        className,
      )}
      {...props}
    >
      {React.Children.map(children, (child, index) =>
        index === 0 ? (
          child
        ) : collapse ? (
          <span className={textClasses}>{child}</span>
        ) : (
          child
        ),
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
