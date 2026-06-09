"use server";
import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import {
  HetznerSSHKey,
  HetznerSSHKeysResponse,
} from "@/types/api/hetzner/ssh-keys";
import { ServerResponse } from "@/types/responses";
import { getApiToken } from "./util";

export async function getSSHKeys(
  projectId: string,
): Promise<ServerResponse<HetznerSSHKey[]>> {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async () => {
      const token = await getApiToken(projectId);

      let sshKeys: HetznerSSHKey[] = [];

      let page = 1;
      const perPage = 50;

      let loop = 1;

      // Fetch all pages of SSH keys
      while (true) {
        const res = await axiosHetzner.get<HetznerSSHKeysResponse>(
          "/ssh_keys",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              page,
              per_page: perPage,
            },
          },
        );

        sshKeys = sshKeys.concat(res.data.ssh_keys);

        if (res.data.meta.pagination.next_page) {
          page = res.data.meta.pagination.next_page;
        } else {
          break;
        }

        loop++;
        if (loop > 10) {
          // Prevent infinite loop in case of API issues
          break;
        }
      }

      return sshKeys;
    },
  );
}
