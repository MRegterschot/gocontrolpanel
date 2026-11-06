import { HetznerMetaPagination } from "./meta";

export interface HetznerSSHKey {
  id: number;
  name: string;
  fingerprint: string;
  public_key: string;
  labels: {
    [key: string]: string;
  };
  created: string;
}

export interface HetznerSSHKeyResponse {
  ssh_key: HetznerSSHKey;
}

export interface HetznerSSHKeysResponse {
  ssh_keys: HetznerSSHKey[];
  meta: HetznerMetaPagination;
}
