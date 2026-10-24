import { deleteEntriesAs } from "@/actions/filemanager/server-only/files";
import { userDataPath } from "@/lib/public-api/files";
import { publicApiRoute } from "@/lib/public-api/route";
import { deleteFiles } from "@gcp/shared/public-api";

export const POST = publicApiRoute(
  deleteFiles,
  async ({ actor, params, body }) => {
    await deleteEntriesAs(actor, params.serverId, body.paths.map(userDataPath));
  },
);
