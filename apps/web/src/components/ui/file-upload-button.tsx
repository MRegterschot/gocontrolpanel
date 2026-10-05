"use client";

import { useRef, type ComponentProps, type ReactNode } from "react";
import { Button } from "./button";

export function FileUploadButton({
  children,
  className,
  disabled,
  ...props
}: Omit<ComponentProps<"input">, "type" | "children"> & {
  children: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className}
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        {children}
      </Button>
      <input {...props} ref={input} type="file" disabled={disabled} hidden />
    </>
  );
}
