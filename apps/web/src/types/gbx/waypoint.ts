export interface Waypoint {
  time: number;
  login: string;
  accountid: string;
  racetime: number;
  laptime: number;
  stuntsscore: number;
  checkpointinrace: number;
  checkpointinlap: number;
  isendrace: boolean;
  isendlap: boolean;
  curracecheckpoints: number[];
  curlapcheckpoints: number[];
  blockid: string;
  speed: number;
}

export interface WaypointEvent {
  time: number;
  login: string;
  accountid: string;
}
