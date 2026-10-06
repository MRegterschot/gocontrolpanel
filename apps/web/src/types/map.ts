import { Maps } from "@gcp/db";
import { SMapInfo } from "@gcp/shared";

export interface LocalMapInfo extends SMapInfo {
  Path: string;
}

export interface JukeboxMap extends Maps {
  QueuedBy: string;
  QueuedByDisplayName: string;
  QueuedAt: Date;
}
