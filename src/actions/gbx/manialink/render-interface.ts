"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { getGbxClient } from "@/lib/gbxclient";
import { Interfaces } from "@/lib/prisma/generated";
import { ServerResponse } from "@/types/responses";
import fs from "fs/promises";
import path from "path";
import { renderLabelComponent } from "./components/label";
import { renderQuadComponent } from "./components/quad";
import { Handlebars } from "@/lib/handlebars";

export async function renderInterface(
  interfaceData: Interfaces,
): Promise<ServerResponse> {
  return doServerActionWithAuth(["admin"], async () => {
    // Hide any existing Manialink pages before rendering the new interface
    const client = await getGbxClient(interfaceData.serverUuid);
    await client.call("SendHideManialinkPage");

    if (!interfaceData.interfaceString) {
      return;
    }

    const data = JSON.parse(interfaceData.interfaceString);

    const manialinks: string[] = [];

    for (const componentData of data) {
      switch (componentData.componentId) {
        case "quad-component":
          manialinks.push(await renderQuadComponent(componentData.attributes));
          break;
        case "label-component":
          manialinks.push(await renderLabelComponent(componentData.attributes));
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
  });
}
