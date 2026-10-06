export interface ECMDriverFinishArgs {
  finishTime: number; // In milliseconds, -1 if DNF
  ubisoftUid: string; // Account ID
  roundNum: number;
  mapId: string; // Map UID
}

export interface ECMRoundEndArgs {
  players: {
    finishTime: number; // In milliseconds, -1 if DNF
    ubisoftUid: string; // Account ID
    position: number; // Starts at 1, DNF order is arbitrary
  }[];
  roundNum: number;
  mapId: string; // Map UID
}
