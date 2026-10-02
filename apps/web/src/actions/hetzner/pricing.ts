"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import { HetznerPricing } from "@/types/api/hetzner/pricing";
import { ServerResponse } from "@/types/responses";
import { getApiToken } from "./util";

export async function getHetznerPricing(
  projectId: string,
): Promise<ServerResponse<HetznerPricing>> {
  return doServerActionWithAuth(
    [
      "hetzner:servers:view",
      `hetzner:${projectId}:moderator`,
      `hetzner:${projectId}:admin`,
    ],
    async () => {
      const token = await getApiToken(projectId);

      const res = await axiosHetzner.get<{
        pricing: HetznerPricing;
      }>("/pricing", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return res.data.pricing;
    },
  );
}
