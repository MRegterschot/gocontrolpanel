import type * as Clubs from "@/services/nadeo/clubs";
import { apiGet } from "./http";

export const getClubActivitiesList = (
  clubId: number,
  offset = 0,
  length = 12,
): ReturnType<typeof Clubs.getClubActivitiesList> =>
  apiGet(`/api/nadeo/clubs/${clubId}/activities`, { offset, length });

export const getClubCampaignWithMaps = (
  clubId: number,
  campaignId: number,
): ReturnType<typeof Clubs.getClubCampaignWithMaps> =>
  apiGet(`/api/nadeo/clubs/${clubId}/campaigns/${campaignId}`);

export const getClubRoomWithNamesAndMaps = (
  clubId: number,
  roomId: number,
): ReturnType<typeof Clubs.getClubRoomWithNamesAndMaps> =>
  apiGet(`/api/nadeo/clubs/${clubId}/rooms/${roomId}`);
