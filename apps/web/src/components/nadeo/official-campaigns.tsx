"use client";
import { Campaign } from "@/types/api/nadeo";
import { DataTable } from "../table/data-table";
import { createColumns } from "./official-campaigns-columns";

export default function OfficialCampaigns({
  serverId,
  campaigns,
}: {
  serverId: string;
  campaigns: Campaign[];
}) {
  const columns = createColumns(serverId);

  return <DataTable columns={columns} data={campaigns} />;
}
