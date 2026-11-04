"use client";

import { IconSettings } from "@tabler/icons-react";
import { useGraphActions } from "../graph-context";

export default function NodeSettingsButton({ id }: { id: string }) {
  const { openNodeSettings } = useGraphActions();

  return (
    <IconSettings
      className="nodrag ml-auto shrink-0 h-[1em] cursor-pointer self-center"
      onClick={(e) => {
        e.stopPropagation();
        openNodeSettings(id);
      }}
    />
  );
}
