import { searchMappacks } from "@/actions/tmx/mappacks";
import MappackSearch from "../mappack-search";

export default async function MappacksTab({
  serverId,
  fmHealth,
}: {
  serverId: string;
  fmHealth: boolean;
}) {
  const { data, error } = await searchMappacks(serverId, {});

  if (error) {
    return <span>{error}</span>;
  }

  return (
    <MappackSearch
      serverId={serverId}
      fmHealth={fmHealth}
      defaultResults={data.Results}
      defaultHasMore={data.More}
    />
  );
}
