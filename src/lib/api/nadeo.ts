import config from "@/lib/config";
import {
  AccountNames,
  Club,
  ClubActivitiesResponse,
  ClubCampaign,
  ClubCampaignsResponse,
  ClubListResponse,
  ClubMembersResponse,
  ClubRoom,
  MapInfo,
  MapLeaderboardsResponse,
  MapRecordsResponse,
  MonthMapListResponse,
  NadeoTokens,
  SeasonalCampaignsResponse,
  ShortsCampaignsResponse,
  TrackmaniaCredentials,
  WebIdentity,
} from "@/types/api/nadeo";
import { ServerError, ServerResponse } from "@/types/responses";
import "server-only";
import { doServerAction } from "../actions";
import { logger } from "../logger";
import { withRateLimit } from "../ratelimiter";
import { getKeyAccountNames, getRedisClient } from "../redis";

const getTokenKey = (audience: string) => `nadeo:tokens:${audience}`;
const CREDENTIALS_TOKEN_KEY = "nadeo:credentials_token";

const PROD_URL = "https://prod.trackmania.core.nadeo.online";
const API_URL = "https://api.trackmania.com/api";
const LIVE_URL = "https://live-services.trackmania.nadeo.live";

// This function is used to authenticate with the Nadeo API and store the tokens in Redis.
export async function authenticate(
  audience: string = "NadeoServices",
): Promise<NadeoTokens> {
  const login = config.NADEO.SERVER_LOGIN;
  const pass = config.NADEO.SERVER_PASSWORD;
  const contact = config.NADEO.CONTACT;

  const auth = Buffer.from(`${login}:${pass}`).toString("base64");

  const meta = {
    type: "nadeo",
    module: "auth",
    function: "authenticate",
  };

  logger.info({ meta }, "Authenticating with Nadeo...");
  const response = await fetch(`${PROD_URL}/v2/authentication/token/basic`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "User-Agent": contact,
    },
    body: JSON.stringify({ audience }),
  });

  if (!response.ok) {
    logger.error(
      {
        meta,
        response: {
          status: response.status,
          statusText: response.statusText,
          error: await response.text(),
        },
        audience,
      },
      "Failed to authenticate with Nadeo",
    );
    throw new ServerError(
      `Failed to authenticate with Nadeo: ${response.status}`,
    );
  }

  logger.info({ meta }, "Authenticated successfully with Nadeo");

  const redis = await getRedisClient();

  const tokens: NadeoTokens = await response.json();
  await redis.set(getTokenKey(audience), JSON.stringify(tokens), "EX", 3600); // Store tokens for 1 hour
  return tokens;
}

// This function is used to authenticate with the Trackmania API and store the credentials token in Redis.
export async function authenticateCredentials(): Promise<string> {
  const clientId = config.NADEO.CLIENT_ID;
  const clientSecret = config.NADEO.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new ServerError(
      "Nadeo client ID and secret are required for authentication.",
    );
  }

  const meta = {
    type: "nadeo",
    module: "auth",
    function: "authenticateCredentials",
  };

  logger.info({ meta }, "Authenticating with Trackmania API...");
  const response = await fetch(`${API_URL}/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    logger.error(
      {
        meta,
        response: {
          status: response.status,
          statusText: response.statusText,
          error: await response.text(),
        },
        clientId,
      },
      "Failed to authenticate with Trackmania API",
    );

    throw new ServerError(
      `Failed to authenticate with Trackmania API: ${response.status}`,
    );
  }

  logger.info({ meta }, "Authenticated successfully with Trackmania API");

  const redis = await getRedisClient();

  const credentials: TrackmaniaCredentials = await response.json();
  await redis.set(
    CREDENTIALS_TOKEN_KEY,
    credentials.access_token,
    "EX",
    credentials.expires_in,
  );
  return credentials.access_token;
}

export async function getTokens(
  audience: string = "NadeoServices",
): Promise<NadeoTokens | null> {
  const redis = await getRedisClient();
  const raw = await redis.get(getTokenKey(audience));
  return raw ? JSON.parse(raw) : null;
}

export async function getCredentialsToken(): Promise<string | null> {
  const redis = await getRedisClient();
  const raw = await redis.get(CREDENTIALS_TOKEN_KEY);
  return raw;
}

export async function getMapsInfo(
  mapUids: string[],
): Promise<ServerResponse<MapInfo[]>> {
  return doServerAction(async () => {
    const url = `${PROD_URL}/maps/?mapUidList=${mapUids.join(",")}`;
    return await doRequest<MapInfo[]>(url);
  });
}

export async function getWebIdentities(
  accountIds: string[],
): Promise<ServerResponse<WebIdentity[]>> {
  return doServerAction(async () => {
    const url = `${PROD_URL}/webidentities/?accountIdList=${accountIds.join(",")}`;
    return await doRequest<WebIdentity[]>(url);
  });
}

export async function searchAccountNames(
  accountNames: string[],
): Promise<ServerResponse<AccountNames>> {
  return doServerAction(async () => {
    const url = `${API_URL}/display-names/account-ids`;
    const params = new URLSearchParams();
    accountNames.forEach((name) => params.append("displayName[]", name));

    return await doCredentialsRequest<AccountNames>(
      `${url}?${params.toString()}`,
    );
  });
}
export async function getAccountNames(
  accountIds: string[],
): Promise<AccountNames> {
  const redis = await getRedisClient();
  const key = getKeyAccountNames();

  const uniqueIds = [...new Set(accountIds)];

  const cached: AccountNames = JSON.parse((await redis.get(key)) ?? "{}");

  const result: AccountNames = {};
  const missingIds: string[] = [];

  for (const id of uniqueIds) {
    if (cached[id]) {
      result[id] = cached[id];
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length === 0) {
    return result;
  }

  const url = `${API_URL}/display-names`;
  const batchSize = 50;

  const batches = Array.from(
    { length: Math.ceil(missingIds.length / batchSize) },
    (_, i) => missingIds.slice(i * batchSize, (i + 1) * batchSize),
  );

  const responses = await Promise.all(
    batches.map((batch) => {
      const params = new URLSearchParams();
      batch.forEach((id) => params.append("accountId[]", id));

      return doCredentialsRequest<AccountNames>(`${url}?${params}`);
    }),
  );

  for (const names of responses) {
    Object.assign(result, names);
    Object.assign(cached, names);
  }

  await redis.set(key, JSON.stringify(cached), "EX", 60 * 60 * 24);

  return result;
}

export async function getTotdRoyalMaps(
  length: number = 1,
  offset: number = 0,
  royal: boolean = false,
): Promise<MonthMapListResponse> {
  const url = `${LIVE_URL}/api/token/campaign/month?length=${length}&offset=${offset}&royal=${royal}`;
  return await doRequest<MonthMapListResponse>(url, "NadeoLiveServices");
}

export async function getSeasonalCampaigns(
  length: number = 1,
  offset: number = 0,
): Promise<SeasonalCampaignsResponse> {
  const url = `${LIVE_URL}/api/campaign/official?length=${length}&offset=${offset}`;
  return await doRequest<SeasonalCampaignsResponse>(url, "NadeoLiveServices");
}

export async function getShortsCampaigns(
  length: number = 1,
  offset: number = 0,
): Promise<ShortsCampaignsResponse> {
  const url = `${LIVE_URL}/api/campaign/weekly-shorts?length=${length}&offset=${offset}`;
  return await doRequest<ShortsCampaignsResponse>(url, "NadeoLiveServices");
}

export async function getClubCampaigns(
  offset: number = 0,
  name: string = "",
  length: number = 12,
): Promise<ClubCampaignsResponse> {
  const url = `${LIVE_URL}/api/token/club/campaign?length=${length}&offset=${offset}&name=${encodeURIComponent(
    name,
  )}`;
  return await doRequest<ClubCampaignsResponse>(url, "NadeoLiveServices");
}

export async function getClubActivities(
  clubId: number,
  offset: number = 0,
  length: number = 12,
): Promise<ClubActivitiesResponse> {
  const url = `${LIVE_URL}/api/token/club/${clubId}/activity?length=${length}&offset=${offset}&active=true`;
  return await doRequest<ClubActivitiesResponse>(url, "NadeoLiveServices");
}

export async function getClubCampaign(
  clubId: number,
  campaignId: number,
): Promise<ClubCampaign> {
  const url = `${LIVE_URL}/api/token/club/${clubId}/campaign/${campaignId}`;
  return await doRequest<ClubCampaign>(url, "NadeoLiveServices");
}

export async function getClubs(
  offset: number = 0,
  name: string = "",
  length: number = 12,
): Promise<ClubListResponse> {
  const url = `${LIVE_URL}/api/token/club?length=${length}&offset=${offset}&name=${encodeURIComponent(
    name,
  )}`;
  return await doRequest<ClubListResponse>(url, "NadeoLiveServices");
}

export async function getClubById(clubId: number): Promise<Club> {
  const url = `${LIVE_URL}/api/token/club/${clubId}`;
  return await doRequest<Club>(url, "NadeoLiveServices");
}

export async function downloadFile(
  url: string,
  fileName: string,
): Promise<File> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 seconds
  const meta = {
    type: "nadeo",
    module: "download",
    function: "downloadFile",
  };

  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/x-gbx",
        "User-Agent": config.NADEO.CONTACT,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      logger.error(
        {
          meta,
          response: {
            status: res.status,
            statusText: res.statusText,
            error: await res.text(),
          },
          url,
          fileName,
        },
        "Failed to download map",
      );
      throw new Error(
        `Failed to download map: ${res.status} ${res.statusText}`,
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    return new File([arrayBuffer], fileName, {
      type: "application/x-gbx",
    });
  } catch (err) {
    if ((err as any).name === "AbortError") {
      logger.error({ meta, url, fileName }, "Download for map timed out");
      throw new Error(`Download for map ${fileName} timed out`);
    }
    throw err;
  }
}

export async function getClubRoom(
  clubId: number,
  roomId: number,
): Promise<ClubRoom> {
  const url = `${LIVE_URL}/api/token/club/${clubId}/room/${roomId}`;
  return await doRequest<ClubRoom>(url, "NadeoLiveServices");
}

export async function getClubMembers(
  clubId: number,
  offset: number = 0,
  length: number = 12,
): Promise<ClubMembersResponse> {
  const url = `${LIVE_URL}/api/token/club/${clubId}/member?length=${length}&offset=${offset}`;
  return await doRequest<ClubMembersResponse>(url, "NadeoLiveServices");
}

export async function getMapLeaderboard(
  mapUid: string,
  length: number = 10,
  offset: number = 0,
): Promise<MapLeaderboardsResponse> {
  const url = `${LIVE_URL}/api/token/leaderboard/group/Personal_Best/map/${mapUid}/top?length=${length}&offset=${offset}&onlyWorld=true`;
  return await doRequest<MapLeaderboardsResponse>(url, "NadeoLiveServices");
}

export async function getMapRecordsByAccounts(
  mapUid: string,
  accountIds: string[],
): Promise<MapRecordsResponse> {
  const { data, error } = await getMapsInfo([mapUid]);
  if (error || data.length === 0) {
    throw new Error("Failed to get map info for records retrieval");
  }

  const mapId = data[0].mapId;

  const url = `${PROD_URL}/v2/mapRecords/by-account?accountIdList=${accountIds.join(",")}&mapId=${mapId}`;
  return await doRequest<MapRecordsResponse>(url);
}

export async function doRequest<T>(
  url: string,
  audience: string = "NadeoServices",
  init: RequestInit = {},
): Promise<T> {
  return withRateLimit("nadeo:doRequest", async () => {
    let tokens = await getTokens(audience);
    if (!tokens) {
      tokens = await authenticate(audience);
    }

    const meta = {
      type: "nadeo",
      module: "request",
      function: "doRequest",
    };

    const headers = new Headers(init.headers);
    headers.set("Authorization", `nadeo_v1 t=${tokens.accessToken}`);
    headers.set("User-Agent", config.NADEO.CONTACT);

    logger.info({ meta, url }, "Requesting Nadeo API");
    let res = await fetch(url, { ...init, headers });

    if (res.status === 401) {
      tokens = await authenticate(audience);
      logger.debug({ meta }, "Retrying Nadeo API request with new tokens");
      headers.set("Authorization", `nadeo_v1 t=${tokens.accessToken}`);
      res = await fetch(url, { ...init, headers });
    }

    if (!res.ok) {
      logger.error(
        {
          meta,
          response: {
            status: res.status,
            statusText: res.statusText,
            error: await res.text(),
          },
          url,
        },
        "Failed to request Nadeo API",
      );
      throw new Error(`Request failed: ${res.status} ${res.statusText}`);
    }

    return res.json();
  });
}

export async function doCredentialsRequest<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  return withRateLimit("nadeo:doCredentialsRequest", async () => {
    let token = await getCredentialsToken();
    if (!token) {
      token = await authenticateCredentials();
    }

    const meta = {
      type: "nadeo",
      module: "request",
      function: "doCredentialsRequest",
    };

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("User-Agent", config.NADEO.CONTACT);

    logger.info({ meta, url }, "Requesting Trackmania API");
    let res = await fetch(url, { ...init, headers });

    if (res.status === 401) {
      token = await authenticateCredentials();
      logger.debug({ meta }, "Retrying Trackmania API request with new token");
      headers.set("Authorization", `Bearer ${token}`);
      res = await fetch(url, { ...init, headers });
    }

    if (!res.ok) {
      logger.error(
        {
          meta,
          response: {
            status: res.status,
            statusText: res.statusText,
            error: await res.text(),
          },
          url,
        },
        "Failed to request Trackmania API",
      );
      throw new Error(`Request failed: ${res.status} ${res.statusText}`);
    }

    return res.json();
  });
}
