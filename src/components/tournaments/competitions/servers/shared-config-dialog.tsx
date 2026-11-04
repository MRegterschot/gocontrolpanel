"use client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ConfigForm from "@/forms/tournaments/config/config-form";
import { ConfigFormSchemaType } from "@/forms/tournaments/config/config-schema";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { reducers } from "@/lib/server-manager";
import { RawServerConfigV2 } from "@/lib/server-manager/types";
import { ReactNode, useState } from "react";
import { useReducer } from "spacetimedb/react";

// A nested dialog, so it stays centered and focusable inside the shared configs dialog.
export default function SharedConfigDialog({ competitionId, config, children }: {
  competitionId: number;
  config?: RawServerConfigV2;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const create = useServerAction(useReducer(reducers.rawServerConfigSharedNew), "Failed to create config", "Config created");
  const update = useServerAction(useReducer(reducers.rawServerConfigSharedUpdate), "Failed to update config", "Config updated");

  // The server keeps the name of an existing config, only the config itself is updated.
  const submit = async ({ name, config: values }: ConfigFormSchemaType) => {
    const ok = config ? await update({ configId: config.id, config: values }) : await create({ name, competitionId, config: values });
    if (ok) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config ? `Edit ${config.name}` : "Create Shared Config"}</DialogTitle>
          <DialogDescription>Shared configs can be used by every match and server in this competition and the ones below it.</DialogDescription>
        </DialogHeader>
        <ConfigForm
          initial={config && { name: config.name, config: config.config as ConfigFormSchemaType["config"] }}
          isEditing={!!config}
          submitLabel={config ? "Save Config" : "Create Config"}
          onSubmit={submit}
        />
      </DialogContent>
    </Dialog>
  );
}
