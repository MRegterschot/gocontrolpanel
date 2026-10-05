import { Maps } from "@tmcp/db";
import { SMapInfo } from "@tmcp/shared";

export interface LocalMapInfo extends SMapInfo {
  Path: string;
}

export interface JukeboxMap extends Maps {
  QueuedBy: string;
  QueuedByDisplayName: string;
  QueuedAt: Date;
}
