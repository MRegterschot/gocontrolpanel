import type { ServerSettingsSchemaType } from "@/forms/server/settings/settings-schema";
import type {
  ApiServerSettings,
  ApiServerSettingsChanges,
} from "@tmcontrolpanel/shared/public-api";
import "server-only";

// The settings form names DisableHorns and DisableServiceAnnounces after the checkbox,
// so true means enabled there; the API uses plain names instead

const VISIBILITY = ["visible", "hidden", "hiddenFromNations"] as const;

export function toApiServerSettings(
  form: ServerSettingsSchemaType,
): ApiServerSettings {
  const o = form.defaultOptions;
  return {
    name: o.Name,
    comment: o.Comment ?? "",
    password: o.Password ?? "",
    spectatorPassword: o.PasswordForSpectator ?? "",
    maxPlayers: o.NextMaxPlayers ?? 0,
    maxSpectators: o.NextMaxSpectators ?? 0,
    keepPlayerSlots: o.KeepPlayerSlots,
    visibility: VISIBILITY[o.HideServer] ?? "visible",
    callVoteTimeout: o.NextCallVoteTimeOut,
    callVoteRatio: o.CallVoteRatio,
    autoSaveReplays: o.AutoSaveReplays,
    horns: o.DisableHorns,
    serviceAnnounces: o.DisableServiceAnnounces,
    profileSkins: form.profileSkins,
    mapDownload: form.allowMapDownload,
    downloadRate: form.downloadRate,
    uploadRate: form.uploadRate,
    helpCommand: form.enableHelpCommand ?? false,
  };
}

// The form values with the API's changes applied, ready for saveServerSettingsAs
export function applyServerSettingsChanges(
  form: ServerSettingsSchemaType,
  changes: ApiServerSettingsChanges,
): ServerSettingsSchemaType {
  const next = { ...toApiServerSettings(form), ...changes };
  return {
    defaultOptions: {
      Name: next.name,
      Comment: next.comment,
      Password: next.password,
      PasswordForSpectator: next.spectatorPassword,
      NextCallVoteTimeOut: next.callVoteTimeout,
      CallVoteRatio: next.callVoteRatio,
      HideServer: VISIBILITY.indexOf(next.visibility),
      NextMaxPlayers: next.maxPlayers,
      NextMaxSpectators: next.maxSpectators,
      KeepPlayerSlots: next.keepPlayerSlots,
      AutoSaveReplays: next.autoSaveReplays,
      DisableHorns: next.horns,
      DisableServiceAnnounces: next.serviceAnnounces,
    },
    allowMapDownload: next.mapDownload,
    downloadRate: next.downloadRate,
    uploadRate: next.uploadRate,
    profileSkins: next.profileSkins,
    enableHelpCommand: next.helpCommand,
  };
}
