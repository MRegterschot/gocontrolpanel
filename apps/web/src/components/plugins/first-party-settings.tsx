"use client";

import Modal from "@/components/modals/modal";
import EcircuitmaniaPluginModal from "@/components/modals/plugins/plugins/ecircuitmania-plugin-modal";
import LiveRoundPluginModal from "@/components/modals/plugins/plugins/live-round-plugin-modal";
import MatchPluginModal from "@/components/modals/plugins/plugins/match-plugin-modal";
import PlayerInfoPluginModal from "@/components/modals/plugins/plugins/player-info-plugin-modal";
import RecordsInfoPluginModal from "@/components/modals/plugins/plugins/records-info-plugin-modal";
import { Button } from "@/components/ui/button";
import type { InstalledPlugin } from "@/types/plugins/catalog";
import { IconSettings } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";

// The first-party plugins keep the panel's hand-made settings forms instead of a config schema
const MODALS: Record<string, ComponentType<any>> = {
  ecm: EcircuitmaniaPluginModal,
  "live-round": LiveRoundPluginModal,
  match: MatchPluginModal,
  "player-info": PlayerInfoPluginModal,
  "records-info": RecordsInfoPluginModal,
};

export function hasFirstPartySettings(plugin: InstalledPlugin): boolean {
  return plugin.firstParty && plugin.slug in MODALS;
}

export function FirstPartySettings({
  serverId,
  plugin,
}: {
  serverId: string;
  plugin: InstalledPlugin;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const PluginModal = hasFirstPartySettings(plugin) ? MODALS[plugin.slug] : null;
  if (!PluginModal) return null;

  return (
    <>
      <Button variant="outline" collapse="sm" onClick={() => setOpen(true)}>
        <IconSettings />
        Configure
      </Button>
      <Modal isOpen={open} setIsOpen={setOpen} closeOnBackdropClick={false}>
        <PluginModal
          serverId={serverId}
          data={{ pluginId: plugin.pluginId, config: plugin.config }}
          onSubmit={() => router.refresh()}
        />
      </Modal>
    </>
  );
}
