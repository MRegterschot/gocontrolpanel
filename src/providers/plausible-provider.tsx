import NextPlausibleProvider from "next-plausible";
import NextPlausibleProvider from "next-plausible";

export default function PlausibleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const apiHost = process.env.PLAUSIBLE_API_HOST;
export default function PlausibleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const apiHost = process.env.PLAUSIBLE_API_HOST;

  if (!apiHost) {
    return <>{children}</>;
  }
  if (!apiHost) {
    return <>{children}</>;
  }

  return (
    <NextPlausibleProvider
      src={`https://${apiHost}/js/script.file-downloads.hash.outbound-links.pageview-props.revenue.tagged-events.js`}
    >
      {children}
    </NextPlausibleProvider>
  );
}
