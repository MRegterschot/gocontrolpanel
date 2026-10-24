import { createEntryAs } from "@/actions/filemanager/server-only/files";
import { toApiFileEntry } from "@/lib/public-api/files";
import { publicApiRoute } from "@/lib/public-api/route";
import { createFolder } from "@gcp/shared/public-api";

export const POST = publicApiRoute(
  createFolder,
  async ({ actor, params, body }) => {
    // Unlike move and delete, the file manager's create takes paths relative to UserData
    const entry = await createEntryAs(actor, params.serverId, {
      path: body.path,
      isDir: true,
    });
    return { data: toApiFileEntry(entry) };
  },
);
