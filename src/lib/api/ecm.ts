import {
  ECMDriverFinishArgs,
  ECMRoundEndArgs,
} from "@/types/api/ecircuitmania";
import { isAxiosError } from "axios";
import "server-only";
import { axiosECM } from "../axios/ecircuitmania";

export async function ecmOnDriverFinish(
  apiKey: string,
  body: ECMDriverFinishArgs,
): Promise<void> {
  const { matchId, authToken } = getMatchIdAndAuthToken(apiKey);

  console.log("Sending ECM driver finish event", {
    matchId,
    body: JSON.stringify(body),
  });

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

    console.log("ECM driver finish response", {
      matchId,
      status: res.status,
      data: res.data,
    });
  } catch (error) {
    if (isAxiosError(error)) {
      console.error("ECM driver finish error", {
        matchId,
        status: error.response?.status,
        data: error.response?.data,
      });
    } else {
      console.error("ECM driver finish unexpected error", {
        matchId,
        error,
      });
    }
  }
}

export async function ecmOnRoundEnd(
  apiKey: string,
  body: ECMRoundEndArgs,
): Promise<void> {
  const { matchId, authToken } = getMatchIdAndAuthToken(apiKey);

  console.log("Sending ECM round end event", {
    matchId,
    body: JSON.stringify(body),
  });

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

    console.log("ECM round end response", {
      matchId,
      status: res.status,
      data: res.data,
    });
  } catch (error) {
    if (isAxiosError(error)) {
      console.error("ECM round end error", {
        matchId,
        status: error.response?.status,
        data: error.response?.data,
      });
    } else {
      console.error("ECM round end unexpected error", {
        matchId,
        error,
      });
    }
  }
}

function getMatchIdAndAuthToken(apiKey: string): {
  matchId: string;
  authToken: string;
} {
  const [matchId, authToken] = apiKey.split("_");
  if (!matchId || !authToken) {
    throw new Error("Invalid ECM API key");
  }
  return { matchId, authToken };
}
