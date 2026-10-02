import { Maps } from "@gcp/db";
import { SMapInfo } from "./gbx/map";

export interface MapInfoMinimal {
  Name: string;
  UId: string;
  FileName: string;
  Environnement: string;
  Author: string;
  AuthorNickname: string;
  GoldTime: number;
  CopperPrice: number;
  MapType: string;
  MapStyle: string;
}

export interface LocalMapInfo extends SMapInfo {
  Path: string;
}

export interface JukeboxMap extends Maps {
  QueuedBy: string;
  QueuedByDisplayName: string;
  QueuedAt: Date;
}
