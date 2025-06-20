import { getRoute } from "@/actions/filemanager";
import Browser from "@/components/filemanager/browser";

export default async function ServerFilesPage({
  params,
  searchParams,
}: {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ path: string }>;
}) {
  const { uuid } = await params;
  const { path } = await searchParams;

  const { data, error } = await getRoute(uuid, path || "/UserData");

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <h1 className="text-2xl font-bold">Failed to get files.</h1>
      </div>
    );
  }

  return <Browser data={data} serverUuid={uuid} path={path || "/UserData"} />;
}
