import { HetznerLocation } from "./locations";
import { HetznerMetaPagination } from "./meta";

export interface HetznerServer {
  id: number;
  name: string;
  status: string;
  created: string;
  public_net: {
    ipv4: {
      id?: number;
      ip: string;
      blocked: boolean;
      dns_ptr: string;
    } | null;
  };
  private_net: {
    network?: number;
    ip?: string;
    alias_ips?: string[];
    mac_address?: string;
  }[];
  server_type: HetznerServerType;
  datacenter: {
    id: number;
    name: string;
    description: string;
    location: HetznerLocation;
    server_types: {
      supported: number[];
      available: number[];
      available_for_migration: number[];
    };
  };
  image: HetznerImage | null;
  outgoing_traffic: number | null;
  ingoing_traffic: number | null;
  included_traffic: number | null;
  volumes: number[];
  labels: {
    [key: string]: string;
  };
}

export interface HetznerServersResponse {
  servers: HetznerServer[];
  meta: HetznerMetaPagination;
}

export interface HetznerServerType {
  id: number;
  name: string;
  description: string;
  cores: number;
  memory: number;
  disk: number;
  deprecated: boolean;
  prices: {
    location: string;
    price_hourly: {
      net: string;
      gross: string;
    };
    price_monthly: {
      net: string;
      gross: string;
    };
    included_traffic: number;
    price_per_tb_traffic: {
      net: string;
      gross: string;
    };
  }[];
  storage_type: string;
  cpu_type: string;
  architecture: string;
}

export interface HetznerServerTypesResponse {
  server_types: HetznerServerType[];
  meta: HetznerMetaPagination;
}

export interface HetznerImage {
  id: number;
  type: string;
  status: string;
  name: string | null;
  description: string;
  image_size: number | null;
  disk_size: number;
  created: string;
  created_from: {
    id: number;
    name: string;
  } | null;
  bound_to: number | null;
  os_flavor: string;
  os_version: string | null;
  rapid_deploy?: boolean;
  protection: {
    delete: boolean;
  };
  deprecated: string | null;
  deleted: string | null;
  labels: {
    [key: string]: string;
  };
  architecture: string;
}

export interface HetznerImagesResponse {
  images: HetznerImage[];
  meta: HetznerMetaPagination;
}

export interface HetznerServerCache {
  id: number;
  projectId: string;
  name: string;
  ip?: string;
  labels: {
    [key: string]: string;
  };
}