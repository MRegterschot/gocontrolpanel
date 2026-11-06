"use client";

import { updateServerTheme } from "@/actions/database/themes";
import ThemeForm from "@/forms/theme/theme-form";
import type { ServerThemeOverview } from "@/services/database/themes";

export default function ServerThemeForm({
  serverId,
  overview,
}: {
  serverId: string;
  overview: ServerThemeOverview;
}) {
  return (
    <ThemeForm
      theme={overview.theme}
      inherited={overview.inherited}
      inheritedLabel={
        overview.inheritedFrom
          ? `the theme of ${overview.inheritedFrom}`
          : "the default theme"
      }
      onSave={(theme) => updateServerTheme(serverId, theme)}
    />
  );
}
