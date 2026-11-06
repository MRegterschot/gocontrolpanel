import { Maps } from "@tmcontrolpanel/db";
import { SMapInfo } from "@tmcontrolpanel/shared";

export interface LocalMapInfo extends SMapInfo {
  Path: string;
}

export interface JukeboxMap extends Maps {
  QueuedBy: string;
  QueuedByDisplayName: string;
  QueuedAt: Date;
}
