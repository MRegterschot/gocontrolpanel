"use server";

import { SendEcmRecordsSchema } from "@/forms/server/records/send-ecm-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { axiosECM } from "@/lib/axios/ecircuitmania";
import { getClient } from "@/lib/dbclient";
import { ECMRoundEndArgs } from "@/types/api/ecircuitmania";
import { ServerError, ServerResponse } from "@/types/responses";
import { isAxiosError } from "axios";
import slugid from "slugid";
import { z } from "zod";
import { logAudit } from "./server-only/audit-logs";

const permissions = (serverId: string) => [
  `servers:${serverId}:moderator`,
  `servers:${serverId}:admin`,
  `group:servers:${serverId}:moderator`,
  `group:servers:${serverId}:admin`,
];

async function savedApiKey(serverId: string): Promise<string> {
  const plugin = await getClient().serverPlugins.findFirst({
    where: { serverId, plugin: { name: "ecm", deletedAt: null } },
    select: { config: true },
  });
  const config = plugin?.config;
  return config &&
    typeof config === "object" &&
    !Array.isArray(config) &&
    typeof config.apiKey === "string"
    ? config.apiKey.trim()
    : "";
}

export async function getEcmKeyStatus(
  serverId: string,
): Promise<ServerResponse<boolean>> {
  return doServerActionWithAuth(
    permissions(serverId),
    async () => !!(await savedApiKey(serverId)),
  );
}

export async function sendRecordsToEcm(
  serverId: string,
  matchId: string,
  input: z.infer<typeof SendEcmRecordsSchema>,
): Promise<ServerResponse<void>> {
  return doServerActionWithAuth(permissions(serverId), async (session) => {
    const values = SendEcmRecordsSchema.parse(input);
    const key = values.apiKey || (await savedApiKey(serverId));
    if (!/^[^_\s]+_[^_\s]+$/.test(key)) {
      throw new ServerError(
        "Enter a valid ECM API key or configure one in the ECM plugin",
        "InvalidApiKey",
      );
    }
    const [ecmMatchId, authToken] = key.split("_");
    const ids = [...new Set(values.recordIds)];
    const match = await getClient().matches.findFirst({
      where: { id: matchId, serverId, deletedAt: null },
      include: {
        map: true,
        records: { where: { id: { in: ids }, serverId, deletedAt: null } },
      },
    });
    if (!match || match.records.length !== ids.length) {
      throw new ServerError(
        "Selected records were not found in this match",
        "RecordsNotFound",
      );
    }
    // Multiple selected rounds produce one ECM round, taking each driver's best time.
    const best = new Map<string, number>();
    for (const record of match.records) {
      if (!record.login || !/^[A-Za-z0-9_-]{22}$/.test(record.login)) {
        throw new ServerError(
          "A selected record has no valid Trackmania account ID",
          "InvalidPlayerLogin",
        );
      }
      if (record.time < -1) {
        throw new ServerError(
          "A selected record has an invalid finish time",
          "InvalidFinishTime",
        );
      }
      const uid = slugid.decode(record.login);
      const previous = best.get(uid);
      if (
        previous === undefined ||
        (record.time !== -1 && (previous === -1 || record.time < previous))
      ) {
        best.set(uid, record.time);
      }
    }
    const players = [...best]
      .sort((a, b) => {
        if (a[1] === -1) return b[1] === -1 ? a[0].localeCompare(b[0]) : 1;
        if (b[1] === -1) return -1;
        return a[1] - b[1] || a[0].localeCompare(b[0]);
      })
      .map(([ubisoftUid, finishTime], index) => ({
        ubisoftUid,
        finishTime,
        position: index + 1,
      }));
    const payload: ECMRoundEndArgs = {
      players,
      roundNum: values.roundNumber,
      mapId: match.map.uid,
    };
    try {
      await axiosECM.post("/match-addRound", payload, {
        params: { matchId: ecmMatchId },
        headers: { Authorization: authToken },
        timeout: 15000,
      });
    } catch (error) {
      // Axios errors contain the request credentials; keep them out of action logs.
      const status = isAxiosError(error) ? error.response?.status : undefined;
      throw new ServerError(
        `eCircuitMania rejected the send${status ? ` (HTTP ${status})` : " or could not be reached"}`,
        "EcmSendFailed",
      );
    }
    await logAudit(session.user.id, serverId, "server.records.ecm.send", {
      matchId,
      recordIds: ids,
      roundNumber: values.roundNumber,
    });
  });
}
