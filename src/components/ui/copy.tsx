"use client";

import { cn } from "@/lib/utils";
import { IconClipboard } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "./button";

function Copy({
  text,
  copyMessage = "Copied to clipboard",
  className,
  ...props
}: { text: string; copyMessage?: string } & React.ComponentProps<"button">) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(copyMessage);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <Button
      type="button"
      variant={"ghost"}
      onClick={handleCopy}
      className={cn("justify-start max-w-fit bg-background overflow-auto", className)}
      {...props}
    >
      {text}
      <IconClipboard />
    </Button>
  );
}

export { Copy };
