import { toApiFileEntry, userDataPath } from "@/lib/public-api/files";
import { publicApiRoute } from "@/lib/public-api/route";
import { listDirectoryAs } from "@/services/filemanager";
import { listFiles } from "@gcp/shared/public-api";

export const GET = publicApiRoute(
  listFiles,
  async ({ actor, params, query }) => {
    const entries = await listDirectoryAs(
      actor,
      params.serverId,
      userDataPath(query.path),
    );
    return { data: entries.map(toApiFileEntry) };
  },
);
