import { hasPermission } from "@/lib/auth";
import { getFileManager } from "@/lib/managers/file-manager";
import { routePermissions, routes } from "@/routes";
import { redirect } from "next/navigation";

export default async function FilesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const canView = await hasPermission(routePermissions.servers.files, id);

  if (!canView) {
    redirect(routes.dashboard);
  }

  try {
    const fileManager = await getFileManager(id);
    if (!fileManager?.health) {
      throw new Error("File Manager is not available");
    }

    return children;
  } catch {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <h1 className="text-2xl font-bold">File Manager is not available</h1>
      </div>
    );
  }
}
