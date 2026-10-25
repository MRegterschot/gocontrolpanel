export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="p-4 lg:p-6 h-full">{children}</div>;
}
