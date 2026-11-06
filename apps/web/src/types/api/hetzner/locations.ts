import { HetznerMetaPagination } from "./meta";

export interface HetznerLocation {
  id: number;
  name: string;
  description: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  network_zone: string;
}

export interface HetznerLocationsResponse {
  locations: HetznerLocation[];
  meta: HetznerMetaPagination;
}
