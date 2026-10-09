"use client";

import ManialinkThemePreview from "@/components/theme/manialink-theme-preview";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/utils";
import { ServerError, ServerResponse } from "@/types/responses";
import type { ManialinkTheme, ThemePalette } from "@gcp/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy, IconRestore } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ThemeSchema, ThemeSchemaType } from "./theme-schema";

const targets: { name: keyof ManialinkTheme; label: string; hint: string }[] = [
  {
    name: "quad",
    label: "Quads",
    hint: "Backgrounds and shapes (bgcolor)",
  },
  {
    name: "label",
    label: "Labels",
    hint: "Text colors (textcolor and color)",
  },
];

const fields: {
  name: keyof ThemePalette;
  label: string;
  description: string;
}[] = [
  {
    name: "foreground",
    label: "Foreground",
    description: "Text and icons",
  },
  {
    name: "background",
    label: "Background",
    description: "Widget and window backgrounds",
  },
  {
    name: "foregroundMuted",
    label: "Muted foreground",
    description: "Secondary text, such as labels and headers",
  },
  {
    name: "backgroundMuted",
    label: "Muted background",
    description: "Rows, headers and buttons",
  },
];

// The color picker works in six digits; manialinks use three
const toPicker = (hex: string) =>
  /^[0-9a-f]{3}$/i.test(hex)
    ? `#${[...hex].map((c) => c + c).join("")}`
    : "#000000";
const fromPicker = (value: string) =>
  [1, 3, 5]
    .map((i) =>
      Math.round(parseInt(value.slice(i, i + 2), 16) / 17).toString(16),
    )
    .join("")
    .toUpperCase();

const upper = (p: ThemePalette): ThemePalette => ({
  foreground: p.foreground.toUpperCase(),
  background: p.background.toUpperCase(),
  foregroundMuted: p.foregroundMuted.toUpperCase(),
  backgroundMuted: p.backgroundMuted.toUpperCase(),
});

export default function ThemeForm({
  theme,
  inherited,
  inheritedLabel,
  onSave,
  callback,
}: {
  // Own theme; null when the inherited one applies
  theme: ManialinkTheme | null;
  inherited: ManialinkTheme;
  // Where the inherited theme comes from, e.g. "the default theme"
  inheritedLabel: string;
  onSave: (theme: ManialinkTheme | null) => Promise<ServerResponse>;
  callback?: () => void;
}) {
  const [hasOwn, setHasOwn] = useState(theme !== null);
  const [resetting, setResetting] = useState(false);
  const form = useForm<ThemeSchemaType>({
    resolver: zodResolver(ThemeSchema),
    defaultValues: theme ?? inherited,
  });
  const values = form.watch();
  const preview = ThemeSchema.safeParse(values).success
    ? (values as ManialinkTheme)
    : (theme ?? inherited);

  async function save(next: ManialinkTheme | null) {
    try {
      const { error } = await onSave(next);
      if (error) throw new ServerError(error, "UpdateThemeError");
      setHasOwn(next !== null);
      if (next === null) form.reset(inherited);
      else form.reset(next);
      toast.success(next ? "Theme saved" : `Theme reset to ${inheritedLabel}`);
      callback?.();
    } catch (error) {
      toast.error("Failed to save theme", {
        description: getErrorMessage(error),
      });
    }
  }

  async function reset() {
    setResetting(true);
    try {
      await save(null);
    } finally {
      setResetting(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) =>
          save({
            quad: upper(v.quad),
            label: upper(v.label),
          }),
        )}
        className="flex flex-col gap-6"
      >
        <p className="text-sm text-muted-foreground">
          {hasOwn
            ? `Uses its own theme instead of ${inheritedLabel}.`
            : `Uses ${inheritedLabel}. Save to give it its own theme.`}{" "}
          Plugins built for SDK 4 or newer use these colors.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            {targets.map((target) => (
              <fieldset key={target.name} className="flex flex-col gap-3">
                <legend className="mb-3 text-sm font-medium">
                  {target.label}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {target.hint}
                  </span>
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {fields.map((field) => (
                    <FormField
                      key={field.name}
                      control={form.control}
                      name={`${target.name}.${field.name}` as const}
                      render={({ field: input }) => (
                        <FormItem>
                          <FormLabel>{field.label}</FormLabel>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              aria-label={`${target.label} ${field.label.toLowerCase()} color picker`}
                              className="h-9 w-10 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
                              value={toPicker(input.value)}
                              onChange={(e) =>
                                form.setValue(
                                  `${target.name}.${field.name}` as const,
                                  fromPicker(e.target.value),
                                  {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  },
                                )
                              }
                            />
                            <FormControl>
                              <Input
                                {...input}
                                maxLength={3}
                                className="font-mono uppercase"
                                placeholder="DDD"
                              />
                            </FormControl>
                          </div>
                          <FormDescription>{field.description}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <ManialinkThemePreview theme={preview} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || resetting}
          >
            <IconDeviceFloppy />
            Save theme
          </Button>
          {hasOwn && (
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting || resetting}
              onClick={() => void reset()}
            >
              <IconRestore />
              Use {inheritedLabel}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
