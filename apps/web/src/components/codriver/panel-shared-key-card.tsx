"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PanelSharedKeyForm from "@/forms/codriver/panel-shared-key-form";
import type { CodriverPanelOverview } from "@/types/codriver";

export default function PanelSharedKeyCard({
  overview,
}: {
  overview: CodriverPanelOverview;
}) {
  const hint = overview.settings.sharedKeyHint;

  return (
    <Card className="gap-6 py-6">
      <CardHeader>
        <CardTitle>Shared API key</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="text-sm">
          {hint ? (
            <>
              Stored key: <code className="font-mono">{hint}</code>
            </>
          ) : (
            <span className="text-muted-foreground">No key stored</span>
          )}
        </div>
        {!hint && overview.envKeyFallback && (
          <p className="text-sm text-muted-foreground">
            ANTHROPIC_API_KEY from the environment is used for now.
          </p>
        )}
        {!overview.canStoreKeys && (
          <p className="text-sm text-destructive" role="alert">
            SECRETS_KEY must be set on the panel before API keys can be stored.
          </p>
        )}
        <PanelSharedKeyForm
          canStoreKeys={overview.canStoreKeys}
          hasKey={!!hint}
        />
      </CardContent>
    </Card>
  );
}
