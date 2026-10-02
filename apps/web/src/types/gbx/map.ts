export interface Map {
  uid: string;
  name: string;
  filename: string;
  author: string;
  authornickname: string;
  environment: string;
  mood: string;
  bronzetime: number;
  silvertime: number;
  goldtime: number;
  authortime: number;
  copperprice: number;
  laprace: boolean;
  nblaps: number;
  maptype: string;
  mapstyle: string;
}

export interface EndMap {
  count: number;
  time: number;
  map: Map;
}

export interface StartMap {
  count: number;
  restarted: boolean;
  time: number;
  map: Map;
}

export interface SMapInfo {
  UId: string;
  Name: string;
  FileName: string;
  Author: string;
  AuthorNickname: string;
  Environnement: string;
  Mood: string;
  BronzeTime: number;
  SilverTime: number;
  GoldTime: number;
  AuthorTime: number;
  CopperPrice: number;
  LapRace: boolean;
  NbLaps: number;
  NbCheckpoints: number;
  MapType: string;
  MapStyle: string;
}
