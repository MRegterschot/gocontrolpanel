import LandingPage from "@/components/landing/landing-page";
import SigningIn from "@/components/landing/signing-in";
import { auth } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/callback-url";
import { getPublicStats } from "@/services/stats";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "GoControlPanel · Trackmania server management",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  const signingIn = params.signingIn === "1";
  const error = typeof params.error === "string" ? params.error : undefined;

  const session = await auth();
  if (session) {
    // Straight back from Nadeo: show that we're signing in while the panel loads,
    // instead of flashing the landing page
    if (signingIn) {
      return <SigningIn redirectTo={callbackUrl} />;
    }
    redirect(callbackUrl);
  }

  const stats = await getPublicStats();

  return (
    <LandingPage
      stats={stats}
      callbackUrl={callbackUrl}
      // Back from Nadeo without a session means the sign in didn't go through
      error={error ?? (signingIn ? "SessionMissing" : undefined)}
    />
  );
}
