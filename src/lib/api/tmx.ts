import { TMXMappackSearch, TMXMapSearch } from "@/types/api/tmx";
import "server-only";
import config from "../config";
import { logger } from "../logger";
import { withRateLimit } from "../ratelimiter";

const TMX_URL = "https://trackmania.exchange";

export async function searchTMXMaps(
  queryParams: Record<string, string>,
  count: number = 12,
): Promise<TMXMapSearch> {
  const fields = [
    "Authors",
    "AwardCount",
    "GbxMapName",
    "HasThumbnail",
    "MapId",
    "MapUid",
    "Medals.Author",
    "Medals.Gold",
    "Medals.Silver",
    "Medals.Bronze",
    "Name",
    "Tags",
    "Images",
  ];

  const params = new URLSearchParams({
    ...queryParams,
    fields: fields.join(","),
    count: count.toString(),
  });

  const url = `${TMX_URL}/api/maps?${params.toString()}`;

  const data = await doRequest<TMXMapSearch>(url, "tmx:searchMaps");

  return data;
}

export async function searchTMXMappacks(
  queryParams: Record<string, string>,
  count: number = 12,
): Promise<TMXMappackSearch> {
  const fields = [
    "MappackId",
    "Name",
    "Description",
    "MapCount",
    "Owner.Name",
    "Owner.UserId",
    "Image.Width",
    "Image.Height",
    "Tags",
  ];

  const params = new URLSearchParams({
    ...queryParams,
    fields: fields.join(","),
    count: count.toString(),
  });

  const url = `${TMX_URL}/api/mappacks?${params.toString()}`;

  const data = await doRequest<TMXMappackSearch>(url, "tmx:searchMappacks");

  return data;
}

export async function downloadTMXMap(
  mapId: number,
  mappackId?: number,
): Promise<File> {
  const url = `${TMX_URL}/mapgbx/${mapId}${mappackId ? `?mappackId=${mappackId}` : ""}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 seconds

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
      throw new Error(`Failed to download map: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return new File([arrayBuffer], `map_${mapId}.Map.Gbx`, {
      type: "application/x-gbx",
    });
  } catch (err) {
    if ((err as any).name === "AbortError") {
      throw new Error(`Download for map ${mapId} timed out`);
    }
    throw err;
  }
}

async function doRequest<T>(url: string, key: string): Promise<T> {
  return withRateLimit<T>(key, async () => {
    logger.trace({ url }, `Requesting TMX API`);

    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": config.NADEO.CONTACT,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch data: ${res.statusText}`);
    }

    return res.json();
  });
}
