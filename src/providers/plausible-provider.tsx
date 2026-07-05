"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const PlausibleProvider = () => {
  const pathname = usePathname();
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  useEffect(() => {
    if (!plausibleDomain) return;

    // 1. Add the Plausible script to the DOM if not already added
    if (!document.getElementById("next-p")) {
      const script = document.createElement("script");
      script.id = "next-p";
      script.async = true;
      script.defer = true;
      script.setAttribute("data-domain", plausibleDomain);
      script.src = "/js/script.js"; // Note: this uses the proxied script
      document.head.appendChild(script);
    }

    // 2. Add Plausible's minimal global initializer
    if (!document.getElementById("next-p-init")) {
      const initScript = document.createElement("script");
      initScript.id = "next-p-init";
      initScript.innerHTML =
        "window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }";
      document.head.appendChild(initScript);
    }

    // 3. Manually track a pageview when route changes
    const trackPageview = (url: string) => {
      const eventData = {
        name: "pageview",
        url,
        domain: window.location.hostname,
        ...(document.referrer && { referrer: document.referrer }),
      };

      fetch("/api/event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      }).catch((err) => console.error("Error tracking pageview:", err));
    };

    trackPageview(pathname);
  }, [pathname]);

  return null;
};

export default PlausibleProvider;
