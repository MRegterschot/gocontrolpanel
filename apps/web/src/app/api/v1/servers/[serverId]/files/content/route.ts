import {
  readFileBytesAs,
  uploadFilesAs,
  writeFileTextAs,
} from "@/actions/filemanager/server-only/files";
import { encodeFile, userDataPath } from "@/lib/public-api/files";
import { publicApiRoute } from "@/lib/public-api/route";
import { readFile, writeFile } from "@gcp/shared/public-api";
import path from "node:path";

export const GET = publicApiRoute(
  readFile,
  async ({ actor, params, query }) => {
    const bytes = await readFileBytesAs(
      actor,
      params.serverId,
      userDataPath(query.path),
    );
    return { data: { path: query.path, ...encodeFile(bytes) } };
  },
);

export const PUT = publicApiRoute(
  writeFile,
  async ({ actor, params, body }) => {
    if (body.encoding === "utf8") {
      await writeFileTextAs(actor, params.serverId, body.path, body.content);
      return;
    }
    // Binary files go through the upload, like maps uploaded in the panel
    const form = new FormData();
    form.append(
      "files",
      new File(
        [Buffer.from(body.content, "base64")],
        path.posix.basename(body.path),
      ),
    );
    form.append(
      "paths[]",
      userDataPath(path.posix.dirname(body.path).replace(/^\.$/, "")),
    );
    await uploadFilesAs(actor, params.serverId, form);
  },
);
