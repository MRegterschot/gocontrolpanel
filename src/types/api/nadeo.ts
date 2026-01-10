import { Maps } from "@/lib/prisma/generated";

export interface NadeoTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TrackmaniaCredentials {
  token_type: string;
  expires_in: number;
  access_token: string;
}

export interface MapInfo {
  author: string;
  authorScore: number;
  bronzeScore: number;
  collectionName: string;
  createdWithGamepadEditor: boolean;
  createdWithSimpleEditor: boolean;
  filename: string;
  goldScore: number;
  isPlayable: boolean;
  mapId: string;
  mapStyle: string;
  mapType: string;
  mapUid: string;
  name: string;
  silverScore: number;
  submitter: string;
  timestamp: Date;
  fileUrl: string;
  thumbnailUrl: string;
}

export interface WebIdentity {
  accountId: string;
  provider: string;
  uid: string;
  timestamp: Date;
}

export interface AccountNames {
  [key: string]: string;
}

export interface MonthMapList {
  year: number;
  month: number;
  lastday: number;
  days: {
    campaignId: number;
    mapUid: string;
    day: number;
    monthDay: number;
    seasonUid: string;
    leaderboardGroup: null;
    startTimestamp: number;
    endTimestamp: number;
    relativeStart: number;
    relativeEnd: number;
  }[];
  media: {
    buttonBackgroundUrl: string;
    buttonForegroundUrl: string;
    decalUrl: string;
    popUpBackgroundUrl: string;
    popUpImageUrl: string;
    liveButtonBackgroundUrl: string;
    liveButtonForegroundUrl: string;
  };
}

type Day = MonthMapList["days"][number];

export type DayWithMap = Day & {
  map: Maps;
};

export interface MonthMapListWithDayMaps extends MonthMapList {
  days: DayWithMap[];
}

export interface MonthMapListResponse {
  monthList: MonthMapList[];
  itemCount: number;
  nextRequestTimestamp: number;
  relativeNextRequest: number;
}

export interface Campaign {
  id: number;
  seasonUid: string;
  name: string;
  useCase: number;
  clubId: number;
  startTimestamp: number;
  endTimestamp: number;
  rankingSentTimestamp: number | null;
  year: number;
  week: number;
  day: number;
  monthYear: number;
  month: number;
  monthDay: number;
  playlist: {
    id: number;
    position: number;
    mapUid: string;
  }[];
  editionTimestamp: number;
}

type Playlist = Campaign["playlist"][number];

export type PlaylistWithMap = Playlist & {
  map: Maps;
};

export interface CampaignWithNamesAndPlaylistMaps extends Campaign {
  playlist: PlaylistWithMap[];
}

export interface SeasonalCampaignsResponse {
  itemCount: number;
  campaignList: Campaign[];
  nextRequestTimestamp: number;
  relativeNextRequest: number;
}

export interface ShortsCampaignsResponse {
  itemCount: number;
  campaignList: Campaign[];
  nextRequestTimestamp: number;
  relativeNextRequest: number;
}

export interface ClubCampaign {
  clubDecalUrl: string;
  campaignId: number;
  activityId: number;
  campaign: {
    color: string;
    leaderboardGroupUid: string;
    publicationTimestamp: number;
    published: boolean;
    latestSeasons: {
      uid: string;
      name: string;
      startTimestamp: number;
      endTimestamp: number;
      relativeStart: number;
      relativeEnd: number;
      campaignId: number;
      active: boolean;
    }[];
    categories: {
      position: number;
      length: number;
      name: string;
    }[];
    media: {
      buttonBackgroundUrl: string;
      buttonForegroundUrl: string;
      decalUrl: string;
      popUpBackgroundUrl: string;
      popUpImageUrl: string;
      liveButtonBackgroundUrl: string;
      liveButtonForegroundUrl: string;
    };
  } & Campaign;
  popularityLevel: number;
  publicationTimestamp: number;
  creationTimestamp: number;
  creatorAccountId: string;
  latestEditorAccountId: string;
  id: number;
  clubId: number;
  clubName: string;
  name: string;
  mapsCount: number;
  mediaUrl: string;
  mediaUrlPngLarge: string;
  mediaUrlPngMedium: string;
  mediaUrlPngSmall: string;
  mediaUrlDds: string;
  mediaTheme: string;
}

export interface ClubCampaignWithNamesAndPlaylistMaps extends ClubCampaign {
  campaign: {
    color: string;
    leaderboardGroupUid: string;
    publicationTimestamp: number;
    published: boolean;
    latestSeasons: {
      uid: string;
      name: string;
      startTimestamp: number;
      endTimestamp: number;
      relativeStart: number;
      relativeEnd: number;
      campaignId: number;
      active: boolean;
    }[];
    categories: {
      position: number;
      length: number;
      name: string;
    }[];
    media: {
      buttonBackgroundUrl: string;
      buttonForegroundUrl: string;
      decalUrl: string;
      popUpBackgroundUrl: string;
      popUpImageUrl: string;
      liveButtonBackgroundUrl: string;
      liveButtonForegroundUrl: string;
    };
  } & CampaignWithNamesAndPlaylistMaps;
  creatorName: string;
  latestEditorName: string;
}

export interface ClubCampaignsResponse {
  clubCampaignList: ClubCampaign[];
  maxPage: number;
  itemCount: number;
}

export interface ClubActivity {
  id: number;
  name: string;
  activityType?: string;
  activityId: number;
  targetActivityId: number;
  campaignId: number;
  position: number;
  public: boolean;
  active: boolean;
  externalId: number;
  featured: boolean;
  password: boolean;
  itemsCount: number;
  clubId: number;
  editionTimestamp: number;
  creatorAccountId: string;
  latestEditorAccountId: string;
  mediaUrl: string;
  mediaUrlPngLarge: string;
  mediaUrlPngMedium: string;
  mediaUrlPngSmall: string;
  mediaUrlDds: string;
  mediaTheme: string;
}

export interface ClubActivitiesResponse {
  activityList: ClubActivity[];
  maxPage: number;
  itemCount: number;
}

export interface Club {
  id: number;
  name: string;
  tag: string;
  description: string;
  authorAccountId: string;
  latestEditorAccountId: string;
  iconUrl: string;
  iconUrlPngLarge: string;
  iconUrlPngMedium: string;
  iconUrlPngSmall: string;
  iconUrlDds: string;
  logoUrl: string;
  decalUrl: string;
  decalUrlPngLarge: string;
  decalUrlPngMedium: string;
  decalUrlPngSmall: string;
  decalUrlDds: string;
  screen16x9Url: string;
  screen16x9UrlPngLarge: string;
  screen16x9UrlPngMedium: string;
  screen16x9UrlPngSmall: string;
  screen16x9UrlDds: string;
  screen64x41Url: string;
  screen64x41UrlPngLarge: string;
  screen64x41UrlPngMedium: string;
  screen64x41UrlPngSmall: string;
  screen64x41UrlDds: string;
  decalSponsor4x1Url: string;
  decalSponsor4x1UrlPngLarge: string;
  decalSponsor4x1UrlPngMedium: string;
  decalSponsor4x1UrlPngSmall: string;
  decalSponsor4x1UrlDds: string;
  screen8x1Url: string;
  screen8x1UrlPngLarge: string;
  screen8x1UrlPngMedium: string;
  screen8x1UrlPngSmall: string;
  screen8x1UrlDds: string;
  screen16x1Url: string;
  screen16x1UrlPngLarge: string;
  screen16x1UrlPngMedium: string;
  screen16x1UrlPngSmall: string;
  screen16x1UrlDds: string;
  verticalUrl: string;
  verticalUrlPngLarge: string;
  verticalUrlPngMedium: string;
  verticalUrlPngSmall: string;
  verticalUrlDds: string;
  backgroundUrl: string;
  backgroundUrlPngLarge: string;
  backgroundUrlPngMedium: string;
  backgroundUrlPngSmall: string;
  backgroundUrlDds: string;
  creationTimestamp: number;
  popularityLevel: number;
  state: string;
  featured: boolean;
  walletUid: string;
  metadata: string;
  editionTimestamp: number;
  iconTheme: string;
  decalTheme: string;
  screen16x9Theme: string;
  screen64x41Theme: string;
  screen8x1Theme: string;
  screen16x1Theme: string;
  verticalTheme: string;
  backgroundTheme: string;
  verified: boolean;
}

export interface ClubListResponse {
  clubList: Club[];
  maxPage: number;
  clubCount: number;
}

export interface ClubWithAccountNames extends Club {
  authorName: string;
  latestEditorName: string;
}

export interface RoomArgs {
  name?: string;
  region?: "eu-west";
  maxPlayersPerServer?: number;
  script?: string;
  scalable?: boolean;
  maps?: string[];
  settings?: {
    key: string;
    value: string;
    type: string;
  }[];
}

export type EditRoomArgs = Partial<RoomArgs>;

export interface Room {
  id: number;
  name: string;
  region: string;
  serverAccountId: string;
  maxPlayers: number;
  playerCount: number;
  maps: string[];
  script: string;
  scalable: boolean;
  scriptSettings: Record<string, { key: string; value: string; type: string }>;
  serverInfo: null;
}

export interface ClubRoom {
  id: number;
  clubId: number;
  clubName: string;
  nadeo: boolean;
  roomId: number;
  campaignId: number | null;
  playerServerLogin: string | null;
  activityId: number;
  name: string;
  room: Room;
  popularityLevel: number;
  creationTimestamp: number;
  creatorAccountId: string;
  latestEditorAccountId: string;
  password: boolean;
  mediaUrl: string;
  mediaUrlPngLarge: string;
  mediaUrlPngMedium: string;
  mediaUrlPngSmall: string;
  mediaUrlDds: string;
  mediaTheme: string;
}

export interface RoomWithMaps extends Room {
  mapObjects: Maps[];
}

export interface ClubRoomWithNamesAndMaps extends ClubRoom {
  creatorName: string;
  latestEditorName: string;
  room: RoomWithMaps;
}

export interface ClubMember {
  accountId: string;
  clubId: number;
  role: string;
  creationTimestamp: number;
  vip: boolean;
  moderator: boolean;
  hasFeatured: boolean;
  pin: boolean;
  useTag: boolean;
}

export interface ClubMemberWithName {
  accountName: string;
}

export interface ClubMembersResponse {
  clubMemberList: ClubMember[];
  maxPage: number;
  itemCount: number;
}

export interface LeaderboardEntry {
  accountId: string;
  zoneId: string;
  zoneName: string;
  position: number;
  score: number;
  timestamp: number;
}

export interface MapLeaderboard {
  zoneId: string;
  zoneName: string;
  top: LeaderboardEntry[];
}

export interface MapLeaderboardsResponse {
  groupUid: string;
  mapUid: string;
  tops: MapLeaderboard[];
}

export type MapRecord = {
  accountId: string;
  filename: string;
  gameMode: string;
  gameModeCustomData: string;
  mapId: string;
  mapRecordId: string;
  medal: number;
  recordScore: {
    respawnCount: number;
    score: number;
    time: number;
  };
  removed: boolean;
  scopeId: string | null;
  scopeType: string;
  timestamp: string;
  url: string;
};

export type MapRecordsResponse = MapRecord[];
