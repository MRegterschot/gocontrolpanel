import { createEntryAs } from "@/actions/filemanager/server-only/files";
import { toApiFileEntry, userDataPath } from "@/lib/public-api/files";
import { publicApiRoute } from "@/lib/public-api/route";
import { createFolder } from "@gcp/shared/public-api";

export const POST = publicApiRoute(
  createFolder,
  async ({ actor, params, body }) => {
    const entry = await createEntryAs(actor, params.serverId, {
      path: userDataPath(body.path),
      isDir: true,
    });
    return { data: toApiFileEntry(entry) };
  },
);
