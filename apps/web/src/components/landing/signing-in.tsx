"use client";

import { IconDeviceGamepad2 } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Shown right after the OAuth round trip. The session already exists, so this only covers
// the time the panel takes to load; the router keeps this screen up until it is ready.
export default function SigningIn({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(redirectTo);
  }, [router, redirectTo]);

  return (
    <main
      className="relative flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden bg-background p-6"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative flex size-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
        <IconDeviceGamepad2 className="size-8 text-primary" />
      </div>

      <div className="relative flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-bold">Signing you in</h1>
        <p className="text-sm text-muted-foreground">
          Signed in with Ubisoft. Loading your servers…
        </p>
      </div>
    </main>
  );
}
