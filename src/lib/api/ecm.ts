import {
  ECMDriverFinishArgs,
  ECMRoundEndArgs,
} from "@/types/api/ecircuitmania";
import { isAxiosError } from "axios";
import "server-only";
import { axiosECM } from "../axios/ecircuitmania";
import { logger } from "../logger";

export async function ecmOnDriverFinish(
  apiKey: string,
  body: ECMDriverFinishArgs,
): Promise<void> {
  const { matchId, authToken } = getMatchIdAndAuthToken(apiKey);

  logger.trace(
    {
      matchId,
      body: JSON.stringify(body),
    },
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

    logger.trace(
      {
        matchId,
        status: res.status,
        data: res.data,
      },
      "ECM driver finish response",
    );
  } catch (error) {
    if (isAxiosError(error)) {
      logger.error(
        {
          matchId,
          status: error.response?.status,
          data: error.response?.data,
        },
        "ECM driver finish error",
      );
    } else {
      logger.error(
        {
          matchId,
          error,
        },
        "ECM driver finish unexpected error",
      );
    }
  }
}

export async function ecmOnRoundEnd(
  apiKey: string,
  body: ECMRoundEndArgs,
): Promise<void> {
  const { matchId, authToken } = getMatchIdAndAuthToken(apiKey);

  logger.trace(
    {
      matchId,
      body: JSON.stringify(body),
    },
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

    logger.trace(
      {
        matchId,
        status: res.status,
        data: res.data,
      },
      "ECM round end response",
    );
  } catch (error) {
    if (isAxiosError(error)) {
      logger.error(
        {
          matchId,
          status: error.response?.status,
          data: error.response?.data,
        },
        "ECM round end error",
      );
    } else {
      logger.error(
        {
          matchId,
          error,
        },
        "ECM round end unexpected error",
      );
    }
  }
}

function getMatchIdAndAuthToken(apiKey: string): {
  matchId: string;
  authToken: string;
} {
  const [matchId, authToken] = apiKey.split("_");
  if (!matchId || !authToken) {
    logger.error(
      {
        apiKey,
      },
      "Invalid ECM API key format",
    );
    throw new Error("Invalid ECM API key");
  }
  return { matchId, authToken };
}
