"use client";
import { setCodriverJevKey } from "@/actions/codriver";
import { Separator } from "@/components/ui/separator";
import PanelSharedKeyForm from "@/forms/codriver/panel-shared-key-form";
import type { CodriverPanelOverview } from "@/types/codriver";

function StoredKey({ hint }: { hint: string | null }) {
  return (
    <div className="text-sm">
      {hint ? (
        <>
          Stored key: <code className="font-mono">{hint}</code>
        </>
      ) : (
        <span className="text-muted-foreground">No key stored</span>
      )}
    </div>
  );
}

// The shared Anthropic and TypeSafe keys, shown beside the panel settings
export default function PanelApiKeys({
  overview,
}: {
  overview: CodriverPanelOverview;
}) {
  const { sharedKeyHint, jevKeyHint, jevEnabled } = overview.settings;
  const jevHasKey = !!jevKeyHint || overview.envJevKeyFallback;
  const jevStatus = !jevEnabled ? "Off" : jevHasKey ? "On" : "Missing key";

  return (
    <div className="flex flex-col gap-6">
      <h3 className="font-semibold">Shared keys</h3>
      {!overview.canStoreKeys && (
        <p className="text-sm text-destructive" role="alert">
          SECRETS_KEY must be set on the panel before API keys can be stored.
        </p>
      )}

      <section className="flex flex-col gap-4">
        <h3 className="font-medium">Anthropic key</h3>
        <StoredKey hint={sharedKeyHint} />
        {!sharedKeyHint && overview.envKeyFallback && (
          <p className="text-sm text-muted-foreground">
            ANTHROPIC_API_KEY from the environment is used for now.
          </p>
        )}
        <PanelSharedKeyForm
          canStoreKeys={overview.canStoreKeys}
          hasKey={!!sharedKeyHint}
        />
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h3 className="font-medium">TypeSafe Jev key</h3>
        <StoredKey hint={jevKeyHint} />
        {!jevKeyHint && overview.envJevKeyFallback && (
          <p className="text-sm text-muted-foreground">
            TYPESAFE_API_KEY from the environment is used for now.
          </p>
        )}
        {jevStatus === "Missing key" && (
          <p className="text-sm text-destructive" role="alert">
            Jev routing is turned on, but Codriver keeps using keyword routing
            until you store a key.
          </p>
        )}
        {jevStatus === "Off" && (
          <p className="text-sm text-muted-foreground">
            Turn on &quot;Route requests with TypeSafe Jev&quot; in the settings
            to use this key.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Jev calls cost a fraction of a cent. That cost is added to the request
          and counts towards the same budgets as Claude.
        </p>
        <PanelSharedKeyForm
          canStoreKeys={overview.canStoreKeys}
          hasKey={!!jevKeyHint}
          save={setCodriverJevKey}
          name="TypeSafe key"
          label="TypeSafe API key"
          placeholder="TypeSafe API key"
          removeTitle="Remove the TypeSafe key?"
          removeDescription="Codriver goes back to keyword routing until a new key is stored."
        />
      </section>
    </div>
  );
}
