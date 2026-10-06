"use client";

import { saveServerAppearance } from "@/actions/plugins";
import Modal, { ModalContent } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { manialinkColor } from "@/lib/plugins/manialink-color";
import { getErrorMessage } from "@/lib/utils";
import {
  serverAppearanceSchema,
  type AppearanceThemeKey,
  type ServerAppearance,
} from "@gcp/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPalette } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AppearanceRulesEditor } from "./appearance-rules-editor";

type ThemeField = {
  key: AppearanceThemeKey;
  label: string;
  kind: "text" | "number" | "color";
  hint: string;
};
const themeGroups: { title: string; fields: ThemeField[] }[] = [
  {
    title: "Text",
    fields: [
      {
        key: "font",
        label: "Font",
        kind: "text",
        hint: "e.g. GameFontSemiBold",
      },
      {
        key: "textColor",
        label: "Text color",
        kind: "color",
        hint: "e.g. FFF",
      },
      {
        key: "textScale",
        label: "Text scale",
        kind: "number",
        hint: "e.g. 1.1",
      },
      {
        key: "lineSpacing",
        label: "Line spacing",
        kind: "number",
        hint: "e.g. 1.2",
      },
    ],
  },
  {
    title: "Standard windows",
    fields: [
      {
        key: "windowTitleBarColor",
        label: "Title bar color",
        kind: "color",
        hint: "e.g. 222",
      },
      {
        key: "windowTitleColor",
        label: "Title text color",
        kind: "color",
        hint: "e.g. DDD",
      },
      {
        key: "windowBackgroundColor",
        label: "Background color",
        kind: "color",
        hint: "e.g. DDD",
      },
    ],
  },
];
// Suggestions only: any font the game knows can be entered
const fonts = [
  "GameFontRegular",
  "GameFontSemiBold",
  "GameFontExtraBold",
  "GameFontBlack",
  "RajdhaniMono",
  "Oswald",
  "OswaldMono",
];

function ServerAppearanceForm({
  serverId,
  appearance,
  closeModal,
}: {
  serverId: string;
  appearance: ServerAppearance;
  closeModal?: () => void;
}) {
  const router = useRouter();
  const fontListId = useId();
  const form = useForm<ServerAppearance>({
    resolver: zodResolver(serverAppearanceSchema),
    defaultValues: appearance,
  });
  const ruleCount = form.watch("rules").length;
  const busy = form.formState.isSubmitting;

  async function save(values: ServerAppearance) {
    try {
      const { error } = await saveServerAppearance(serverId, values);
      if (error) throw new Error(error);
      toast.success("Plugin appearance saved");
      router.refresh();
      closeModal?.();
    } catch (error) {
      toast.error("Failed to save plugin appearance", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <ModalContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>Plugin appearance for all plugins</DialogTitle>
        <DialogDescription>
          Applies to every plugin with a Manialink UI on this server. A plugin’s
          own appearance settings take precedence.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(save)} className="space-y-4">
          <fieldset disabled={busy} className="min-w-0 space-y-4">
            <datalist id={fontListId}>
              {fonts.map((font) => (
                <option key={font} value={font} />
              ))}
            </datalist>
            {themeGroups.map((group) => (
              <section
                key={group.title}
                className="space-y-3 rounded-lg border p-4"
                aria-label={group.title}
              >
                <h3 className="font-medium">{group.title}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.fields.map((theme) => (
                    <FormField
                      key={theme.key}
                      control={form.control}
                      name={`theme.${theme.key}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{theme.label}</FormLabel>
                          <div className="flex gap-2">
                            {theme.kind === "color" && (
                              <input
                                type="color"
                                aria-label={`${theme.label} picker`}
                                value={manialinkColor(field.value).slice(0, 7)}
                                className="h-9 w-10 shrink-0 cursor-pointer rounded border bg-transparent"
                                onChange={(event) => {
                                  // Keep an existing alpha channel
                                  const current = manialinkColor(field.value);
                                  field.onChange(
                                    event.target.value.slice(1) +
                                      (current.length === 9
                                        ? current.slice(7)
                                        : ""),
                                  );
                                }}
                              />
                            )}
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                type={
                                  theme.kind === "number" ? "number" : "text"
                                }
                                step={
                                  theme.kind === "number" ? "any" : undefined
                                }
                                min={theme.kind === "number" ? 0 : undefined}
                                list={
                                  theme.key === "font" ? fontListId : undefined
                                }
                                placeholder={`Plugin default (${theme.hint})`}
                                onChange={(event) =>
                                  field.onChange(
                                    event.target.value.replace(/^#/, ""),
                                  )
                                }
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </section>
            ))}
            <p className="text-sm text-muted-foreground">
              Leave a field empty to keep each plugin’s own value. Text color
              applies to every label, including buttons, so check contrast.
              Window options affect windows built on the standard SDK window.
            </p>
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Advanced rules ({ruleCount})
              </summary>
              <div className="mt-4 space-y-4">
                <AppearanceRulesEditor
                  description="Rules apply to every plugin, after the options above. A widget/window name matches that name in any plugin. Standard SDK widgets use frame ID “widget”; windows use “window”."
                  empty="No server-wide rules. Add one for styling the options above do not cover."
                />
              </div>
            </details>
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset({ theme: {}, rules: [] })}
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

export function ServerAppearanceDialog(props: {
  serverId: string;
  appearance: ServerAppearance;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Modal isOpen={open} setIsOpen={setOpen} closeOnBackdropClick={false}>
      <ServerAppearanceForm {...props} />
      <Button variant="outline">
        <IconPalette />
        Plugin appearance
      </Button>
    </Modal>
  );
}
