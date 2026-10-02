import { getTotdMonth } from "@/actions/nadeo/totd";
import TotdMonths from "../totd-months";

export default async function TotdTab({
  serverId,
  fmHealth,
  offset,
}: {
  serverId: string;
  fmHealth: boolean;
  offset: number;
}) {
  const { data } = await getTotdMonth(serverId, offset);

  return (
    <TotdMonths
      serverId={serverId}
      fmHealth={fmHealth}
      mapList={data}
      offset={offset}
    />
  );
}
