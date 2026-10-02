import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import { GbxClient } from "@evotm/gbxclient";
import "server-only";

export async function triggerModeScriptEventArray(
  client: GbxClient,
  method: string,
  params: string[],
) {
  await client.call("TriggerModeScriptEventArray", method, params);
}

export async function pauseMatch(manager: GbxClientManager, pause: boolean) {
  await triggerModeScriptEventArray(
    manager.client,
    "Maniaplanet.Pause.SetActive",
    pause ? ["true"] : ["false"],
  );

  if (pause) {
    manager.info.liveInfo.isPaused = true;
    if (manager.roundNumber !== null) {
      manager.roundNumber--;
    }
  }
}

export async function setScriptName(client: GbxClient, script: string) {
  await client.call("SetScriptName", script);
}
