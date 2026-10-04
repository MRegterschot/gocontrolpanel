import LandingPage from "@/components/landing/landing-page";
import SigningIn from "@/components/landing/signing-in";
import { auth } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/callback-url";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/site";
import { getPublicStats } from "@/services/stats";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  // One canonical URL for the ?callbackUrl, ?error and ?signingIn variants
  alternates: { canonical: "/login" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/login",
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    // Page-level openGraph replaces the layout's, which drops the file-based image
    images: [
      {
        url: "/opengraph-image.png",
        width: 1000,
        height: 1000,
        alt: `${SITE_NAME} logo`,
      },
    ],
  },
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
