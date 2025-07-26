import { HetznerLocation } from "./locations";
import { HetznerMetaPagination } from "./meta";

export interface HetznerVolume {
  id: number;
  created: string;
  name: string;
  server: number | null;
  location: HetznerLocation;
  size: number;
  linux_device: string;
  protection: {
    delete: boolean;
  };
  labels: {
    [key: string]: string;
  };
  status: "available" | "creating";
  format: string | null;
}

export interface HetznerVolumesResponse {
  volumes: HetznerVolume[];
  meta: HetznerMetaPagination;
}
