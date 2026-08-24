import { searchMaps } from "@/actions/tmx/maps";
import MapSearch from "../map-search";

export default async function MapsTab({
  serverId,
  fmHealth,
}: {
  serverId: string;
  fmHealth: boolean;
}) {
  const { ok, data, error } = await searchMaps(serverId, {});

  if (!ok) {
    return <span>{error}</span>;
  }

  return (
    <MapSearch
      serverId={serverId}
      fmHealth={fmHealth}
      defaultResults={data.Results}
      defaultHasMore={data.More}
    />
  );
}
