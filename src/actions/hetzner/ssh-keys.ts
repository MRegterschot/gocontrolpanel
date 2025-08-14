import { axiosHetzner } from "@/lib/axios/hetzner";
import { generateSSHKeyPair } from "@/lib/ssh";
import { HetznerSSHKeyResponse } from "@/types/api/hetzner/ssh-keys";
import "server-only";
import { getApiToken } from "./util";

export async function createHetznerSSHKey(
  projectId: string,
  name: string,
): Promise<{
  id: number;
  publicKey: string;
  privateKey: string;
}> {
  const token = await getApiToken(projectId);

  const keys = generateSSHKeyPair();

  const res = await axiosHetzner.post<HetznerSSHKeyResponse>(
    "/ssh_keys",
    {
      name,
      public_key: keys.publicKey,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return {
    id: res.data.ssh_key.id,
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
  };
}

export async function deleteHetznerSSHKey(
  projectId: string,
  sshKeyId: number,
): Promise<void> {
  const token = await getApiToken(projectId);

  await axiosHetzner.delete(`/ssh_keys/${sshKeyId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
