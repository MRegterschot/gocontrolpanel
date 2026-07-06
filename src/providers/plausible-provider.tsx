import Script from "next/script";

export default function PlausibleProvider() {
  const plausibleDomain = process.env.PLAUSIBLE_DOMAIN;
  const plausibleApiHost = process.env.PLAUSIBLE_API_HOST;

  if (!plausibleDomain || !plausibleApiHost) return null;

  return (
    <>
      <Script
        defer
        data-domain={plausibleDomain}
        src={`https://${plausibleApiHost}/js/script.file-downloads.hash.outbound-links.pageview-props.revenue.tagged-events.js`}
        strategy="afterInteractive"
      />

      <Script
        id="plausible-init"
        dangerouslySetInnerHTML={{
          __html: `
                  window.plausible = window.plausible || function() {
                    (window.plausible.q = window.plausible.q || []).push(arguments);
                  };
                `,
        }}
        strategy="afterInteractive"
      />
    </>
  );
}

export const dynamic = "force-dynamic";
