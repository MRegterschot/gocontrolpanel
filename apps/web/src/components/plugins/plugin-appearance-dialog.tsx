"use client";

import { saveServerPluginAppearance } from "@/actions/plugins";
import Modal, { ModalContent } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import type { InstalledPlugin } from "@/types/plugins/catalog";
import {
  pluginAppearanceSchema,
  type PluginAppearance,
  type ServerAppearance,
} from "@gcp/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPalette } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AppearanceRulesEditor } from "./appearance-rules-editor";
import { ManialinkAppearanceEditor } from "./manialink-appearance-editor";

function AppearanceForm({
  serverId,
  plugin,
  serverAppearance,
  closeModal,
}: {
  serverId: string;
  plugin: InstalledPlugin;
  serverAppearance: ServerAppearance;
  closeModal?: () => void;
}) {
  const router = useRouter();
  const form = useForm<PluginAppearance>({
    resolver: zodResolver(pluginAppearanceSchema),
    defaultValues: plugin.appearance,
  });
  const ruleCount = form.watch("rules").length;
  const busy = form.formState.isSubmitting;

  async function save(appearance: PluginAppearance) {
    try {
      const { error } = await saveServerPluginAppearance(
        serverId,
        plugin.pluginId,
        appearance,
      );
      if (error) throw new Error(error);
      toast.success("Appearance saved");
      router.refresh();
      closeModal?.();
    } catch (error) {
      toast.error("Failed to save appearance", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <ModalContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
      <DialogHeader>
        <DialogTitle>{plugin.name} appearance</DialogTitle>
        <DialogDescription>
          Select an element, adjust its appearance and preview your changes
          before saving.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(save)} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4 min-w-0">
            <ManialinkAppearanceEditor
              serverId={serverId}
              pluginId={plugin.pluginId}
              serverAppearance={serverAppearance}
            />
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Advanced rules ({ruleCount})
              </summary>
              <div className="mt-4 space-y-4">
                <AppearanceRulesEditor
                  description="Target all elements of a type, or narrow a rule by widget/window name, element ID or class from the plugin template. Leave optional fields empty to match all. Positions are relative to the parent frame. Standard SDK widgets use frame ID “widget”; windows use “window”."
                  empty="Using the plugin’s original appearance. Add a rule to customize it."
                />
              </div>
            </details>
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset({ rules: [] })}
              >
                Reset to plugin defaults
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Save appearance"}
                </Button>
              </div>
            </div>
          </fieldset>
        </form>
      </Form>
    </ModalContent>
  );
}

export function PluginAppearanceDialog(props: {
  serverId: string;
  plugin: InstalledPlugin;
  serverAppearance: ServerAppearance;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Modal isOpen={open} setIsOpen={setOpen} closeOnBackdropClick={false}>
      <AppearanceForm {...props} />
      <Button variant="outline" collapse="sm">
        <IconPalette />
        Appearance
      </Button>
    </Modal>
  );
}
