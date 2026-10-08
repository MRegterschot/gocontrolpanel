import "server-only";
import { campaignTools } from "./tools/campaigns";
import { infoTools } from "./tools/info";
import { mapTools } from "./tools/maps";
import { modeTools } from "./tools/mode";
import { playerTools } from "./tools/players";
import { pluginTools } from "./tools/plugins";
import { serverTools } from "./tools/server";
import type { CodriverTool } from "./types";

export const codriverTools: CodriverTool[] = [
  ...infoTools,
  ...mapTools,
  ...campaignTools,
  ...modeTools,
  ...playerTools,
  ...pluginTools,
  ...serverTools,
];
