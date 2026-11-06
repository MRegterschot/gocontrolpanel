import { cn } from "@/lib/utils";
import * as React from "react";
import { formControlVariants } from "./form-control";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        formControlVariants({ size: "auto" }),
        "flex min-h-20 w-full min-w-0 py-2",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
