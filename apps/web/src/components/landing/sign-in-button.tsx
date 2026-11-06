"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconKey, IconLoader2 } from "@tabler/icons-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

// Nadeo sends the user back to the landing page with ?signingIn, which shows the loading
// state instead of the landing page while the panel opens
export function signingInUrl(callbackUrl: string) {
  const params = new URLSearchParams({ signingIn: "1", callbackUrl });
  return `/login?${params.toString()}`;
}

export default function SignInButton({
  callbackUrl,
  className,
  size = "lg",
  label = "Sign in with Ubisoft",
}: {
  callbackUrl: string;
  className?: string;
  size?: "default" | "lg";
  label?: string;
}) {
  const [redirecting, setRedirecting] = useState(false);

  const handleClick = async () => {
    setRedirecting(true);
    try {
      await signIn("nadeo", { callbackUrl: signingInUrl(callbackUrl) });
    } catch {
      setRedirecting(false);
    }
  };

  return (
    <Button
      size={size}
      className={cn("font-semibold", className)}
      onClick={handleClick}
      disabled={redirecting}
      aria-busy={redirecting}
    >
      {redirecting ? <IconLoader2 className="animate-spin" /> : <IconKey />}
      {redirecting ? "Redirecting to Ubisoft…" : label}
    </Button>
  );
}
