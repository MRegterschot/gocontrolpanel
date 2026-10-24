import { moveEntriesAs } from "@/actions/filemanager/server-only/files";
import { toApiFileEntry, userDataPath } from "@/lib/public-api/files";
import { publicApiRoute } from "@/lib/public-api/route";
import { moveFiles } from "@gcp/shared/public-api";

export const POST = publicApiRoute(
  moveFiles,
  async ({ actor, params, body }) => {
    const entries = await moveEntriesAs(actor, params.serverId, {
      items: body.items.map((item) => ({
        from: userDataPath(item.from),
        to: userDataPath(item.to),
      })),
    });
    return { data: entries.map(toApiFileEntry) };
  },
);
