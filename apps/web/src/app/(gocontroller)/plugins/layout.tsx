export default async function PluginsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="p-4 lg:p-6 h-full">{children}</div>;
}
