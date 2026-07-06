"use client";

import NextPlausibleProvider, { usePlausible } from "next-plausible";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function PlausibleProvider({
  apiHost,
  children,
}: {
  apiHost?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const track = usePlausible();
  const hasTrackedInitialRoute = useRef(false);

  useEffect(() => {
    if (!apiHost || typeof window === "undefined") {
      return;
    }

    if (!hasTrackedInitialRoute.current) {
      hasTrackedInitialRoute.current = true;
      return;
    }

    const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;

    track("pageview", { u: url });
  }, [apiHost, pathname, track]);

  if (!apiHost) {
    return <>{children}</>;
  }

  return (
    <NextPlausibleProvider
      src={`https://${apiHost}/js/script.file-downloads.hash.outbound-links.pageview-props.revenue.tagged-events.js`}
      enabled={true}
      init={{
        captureOnLocalhost: true,
      }}
    >
      {children}
    </NextPlausibleProvider>
  );
}
