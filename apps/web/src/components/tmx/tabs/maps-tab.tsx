import { searchMaps } from "@/actions/tmx/maps";
import MapSearch from "../map-search";

export default async function MapsTab({
  serverId,
  fmHealth,
}: {
  serverId: string;
  fmHealth: boolean;
}) {
  const { data, error } = await searchMaps(serverId, {});

  if (error) {
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
