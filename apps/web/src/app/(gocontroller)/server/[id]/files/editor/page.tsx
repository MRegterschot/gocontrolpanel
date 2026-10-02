import { getFile } from "@/actions/filemanager";
import FilesBreadcrumbs from "@/components/filemanager/breadcrumbs";
import TextEditor from "@/components/filemanager/text-editor";
import { arrayBufferToBase64, pathToBreadcrumbs } from "@/lib/utils";
import Image from "next/image";

export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ path: string }>;
}) {
  const { id } = await params;
  const { path } = await searchParams;

  const { data, error } = await getFile(id, path || "/UserData");

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <h1 className="text-2xl font-bold">Failed to get file.</h1>
      </div>
    );
  }

  if (data.type === "image" || data.type === "video") {
    return (
      <div className="flex flex-col w-full h-full">
        <FilesBreadcrumbs
          crumbs={pathToBreadcrumbs(path).slice(1)}
          serverId={id}
          className="h-9 flex items-center"
        />

        <div className="flex items-center justify-center h-full pt-4">
          {data.type === "image" ? (
            <Image
              src={`data:image/png;base64,${arrayBufferToBase64(data.value as ArrayBuffer)}`}
              alt={path.split("/").pop() || "Image"}
              fill
              className="object-contain static! max-h-[calc(100vh-11rem)]"
            />
          ) : (
            <video controls className="max-h-[calc(100vh-11rem)] max-w-full">
              <source
                src={`data:video/mp4;base64,${arrayBufferToBase64(data.value as ArrayBuffer)}`}
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      <TextEditor
        defaultText={data.value as string}
        path={path}
        serverId={id}
      />
    </div>
  );
}
