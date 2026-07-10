import {
  getGbxClient,
  getGbxClientManager,
} from "@/lib/managers/gbxclient-manager";
import "server-only";

export async function triggerModeScriptEventArray(
  serverId: string,
  method: string,
  params: string[],
) {
  const client = await getGbxClient(serverId);
  await client.call("TriggerModeScriptEventArray", method, params);
}

export async function pauseMatch(serverId: string, pause: boolean) {
  await triggerModeScriptEventArray(
    serverId,
    "Maniaplanet.Pause.SetActive",
    pause ? ["true"] : ["false"],
  );

  if (pause) {
    const manager = await getGbxClientManager(serverId);
    manager.info.liveInfo.isPaused = true;
    if (manager.roundNumber !== null) {
      manager.roundNumber--;
    }
  }
}

export async function setScriptName(serverId: string, script: string) {
  const client = await getGbxClient(serverId);
  await client.call("SetScriptName", script);
}
