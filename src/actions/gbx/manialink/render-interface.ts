"use server";

import { logAudit } from "@/actions/database/server-only/audit-logs";
import { doServerActionWithAuth } from "@/lib/actions";
import { Handlebars } from "@/lib/handlebars";
import { getGbxClient } from "@/lib/managers/gbxclient-manager";
import { Interfaces } from "@/lib/prisma/generated";
import { ServerResponse } from "@/types/responses";
import fs from "fs/promises";
import path from "path";
import { renderLabelComponent } from "./components/label";
import { renderQuadComponent } from "./components/quad";

export async function renderInterface(
  interfaceData: Interfaces,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${interfaceData.serverId}:admin`,
      `group:servers:${interfaceData.serverId}:admin`,
    ],
    async (session) => {
      // Hide any existing Manialink pages before rendering the new interface
      const client = await getGbxClient(interfaceData.serverId);
      await client.call("SendHideManialinkPage");

      if (!interfaceData.interfaceString) {
        return;
      }

      const data = JSON.parse(interfaceData.interfaceString);

      const manialinks: string[] = [];

      for (const componentData of data) {
        switch (componentData.componentId) {
          case "quad-component":
            manialinks.push(
              await renderQuadComponent(componentData.attributes),
            );
            break;
          case "label-component":
            manialinks.push(
              await renderLabelComponent(componentData.attributes),
            );
            break;
          default:
            console.warn(`Unknown component id: ${componentData.componentId}`);
        }
      }

      const templatePath = path.resolve(
        process.cwd(),
        "src/lib/manialink/manialink.hbs",
      );
      const templateSource = await fs.readFile(templatePath, "utf-8");
      const template = Handlebars.compile(templateSource);
      const manialink = template({
        id: interfaceData.id,
        manialinks,
      });

      await client.call("SendDisplayManialinkPage", manialink, 0, false);

      await logAudit(
        session.user.id,
        interfaceData.serverId,
        "server.interface.render",
        interfaceData,
      );
    },
  );
}
