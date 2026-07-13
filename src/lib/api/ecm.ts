import {
  ECMDriverFinishArgs,
  ECMRoundEndArgs,
} from "@/types/api/ecircuitmania";
import { isAxiosError } from "axios";
import "server-only";
import { axiosECM } from "../axios/ecircuitmania";
import { getLogger } from "../logger";

export async function ecmOnDriverFinish(
  apiKey: string,
  body: ECMDriverFinishArgs,
  serverId: string,
): Promise<void> {
  const meta = {
    type: "ecm",
    module: "ecircuitmania",
    function: "ecmOnDriverFinish",
  };
  const log = getLogger(serverId);
  const { matchId, authToken } = getMatchIdAndAuthToken(apiKey, serverId);

  log.info(
    { meta, matchId, body: JSON.stringify(body) },
    "Sending ECM driver finish event",
  );

  try {
    const res = await axiosECM.post(
      "/match-addRoundTime?matchId=" + matchId,
      body,
      {
        headers: {
          Authorization: authToken,
        },
      },
    );

    log.debug(
      { meta, matchId, status: res.status, data: res.data },
      "ECM driver finish response",
    );
  } catch (error) {
    if (isAxiosError(error)) {
      log.error(
        {
          meta,
          matchId,
          status: error.response?.status,
          data: error.response?.data,
        },
        "ECM driver finish error",
      );
    } else {
      log.error({ meta, error, matchId }, "ECM driver finish unexpected error");
    }
  }
}

export async function ecmOnRoundEnd(
  apiKey: string,
  body: ECMRoundEndArgs,
  serverId: string,
): Promise<void> {
  const meta = {
    type: "ecm",
    module: "ecircuitmania",
    function: "ecmOnRoundEnd",
  };
  const log = getLogger(serverId);
  const { matchId, authToken } = getMatchIdAndAuthToken(apiKey, serverId);

  log.debug(
    { meta, matchId, body: JSON.stringify(body) },
    "Sending ECM round end event",
  );

  try {
    const res = await axiosECM.post(
      "/match-addRound?matchId=" + matchId,
      body,
      {
        headers: {
          Authorization: authToken,
        },
      },
    );

    log.debug(
      { meta, matchId, status: res.status, data: res.data },
      "ECM round end response",
    );
  } catch (error) {
    if (isAxiosError(error)) {
      log.error(
        {
          meta,
          matchId,
          status: error.response?.status,
          data: error.response?.data,
        },
        "ECM round end error",
      );
    } else {
      log.error({ meta, error, matchId }, "ECM round end unexpected error");
    }
  }
}

function getMatchIdAndAuthToken(
  apiKey: string,
  serverId: string,
): {
  matchId: string;
  authToken: string;
} {
  const meta = {
    type: "ecm",
    module: "ecircuitmania",
    function: "getMatchIdAndAuthToken",
  };
  const log = getLogger(serverId);
  const [matchId, authToken] = apiKey.split("_");
  if (!matchId || !authToken) {
    log.error({ meta, apiKey }, "Invalid ECM API key format");
    throw new Error("Invalid ECM API key");
  }
  return { matchId, authToken };
}
