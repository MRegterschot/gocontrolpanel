import NextPlausibleProvider from "next-plausible";

export default function PlausibleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const domain = process.env.PLAUSIBLE_DOMAIN;
  const apiHost = process.env.PLAUSIBLE_API_HOST;

  if (!apiHost || !domain) {
    return <>{children}</>;
  }

  return (
    <NextPlausibleProvider
      data-domain={domain}
      src={`https://${apiHost}/js/script.file-downloads.hash.outbound-links.pageview-props.revenue.tagged-events.js`}
    >
      {children}
    </NextPlausibleProvider>
  );
}
