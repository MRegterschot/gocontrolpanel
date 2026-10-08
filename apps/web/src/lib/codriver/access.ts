import config from "@/lib/config";
import "server-only";
import { CODRIVER_MODELS } from "./model";
import type { CodriverRole } from "./types";

export type CodriverAccess =
  | {
      allowed: true;
      apiKey: string;
      primaryModel: string;
      escalationModel: string | null;
    }
  | { allowed: false; reason: string };

// Temporary gate until the operator and server settings exist (phase 3 of docs/codriver-plan.md):
// the panel-wide key from the environment, and players with a panel role only
export function checkAccess(role: CodriverRole): CodriverAccess {
  if (!config.CODRIVER.API_KEY) {
    return { allowed: false, reason: "Codriver is not set up on this panel." };
  }
  if (role === "guest") {
    return {
      allowed: false,
      reason: "You don't have access to Codriver on this server.",
    };
  }
  return {
    allowed: true,
    apiKey: config.CODRIVER.API_KEY,
    primaryModel: CODRIVER_MODELS.haiku,
    escalationModel: CODRIVER_MODELS.sonnet,
  };
}
