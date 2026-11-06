import { HetznerMetaPagination } from "./meta";

export interface HetznerNetwork {
  id: number;
  name: string;
  ip_range: string;
  subnets: {
    type: "cloud" | "server" | "vswitch";
    ip_range?: string;
    network_zone: string;
    gateway: string;
    vswitch_id: number | null;
  }[];
  routes: {
    destination: string;
    gateway: string;
  }[];
  servers: number[];
  load_balancers: number[];
  protection: {
    delete: boolean;
  };
  labels: {
    [key: string]: string;
  };
  created: string;
  expose_routes_to_vswitch: boolean;
}

export interface HetznerNetworksResponse {
  networks: HetznerNetwork[];
  meta: HetznerMetaPagination;
}
