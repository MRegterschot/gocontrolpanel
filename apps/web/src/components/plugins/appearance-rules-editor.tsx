"use client";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MANIALINK_STYLE_ATTRIBUTES,
  MANIALINK_STYLE_ELEMENTS,
  type ManialinkStyleAttribute,
  type PluginAppearance,
} from "@gcp/shared";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useId } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

const propertyLabels: Partial<Record<ManialinkStyleAttribute, string>> = {
  textfont: "Font",
  textsize: "Text size",
  textcolor: "Text color",
  bgcolor: "Background color",
  pos: "Position (X Y)",
  size: "Size (width height)",
  scale: "Scale",
  rot: "Rotation",
  "z-index": "Layer",
  opacity: "Opacity (0–1)",
  halign: "Horizontal alignment",
  valign: "Vertical alignment",
  style: "Game style",
  substyle: "Game substyle",
  hidden: "Hidden (0 or 1)",
};
const hints: Partial<Record<ManialinkStyleAttribute, string>> = {
  textfont: "Font name supported by the game",
  textsize: "e.g. 2",
  textcolor: "e.g. FFF or FF8800",
  bgcolor: "e.g. 222C",
  pos: "e.g. -150 70",
  size: "e.g. 50 10",
  scale: "e.g. 1.2",
  opacity: "e.g. 0.8",
  halign: "left, center or right",
  valign: "top, center, center2 or bottom",
  keepratio: "Inactive, Clip or Fit",
};

// Ordered appearance rules of the surrounding form, shared by plugin and server appearance
export function AppearanceRulesEditor({
  description,
  empty,
}: {
  description: string;
  empty: string;
}) {
  const form = useFormContext<PluginAppearance>();
  const inputId = useId();
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "rules",
  });
  const rules = form.watch("rules");
  const busy = form.formState.isSubmitting;
  return (
    <>
      <p className="text-sm text-muted-foreground">{description}</p>
      {fields.length === 0 && (
        <p className="rounded-md border p-4 text-sm">{empty}</p>
      )}
      {fields.map((rule, index) => (
        <section
          key={rule.id}
          className="space-y-3 rounded-md border p-4"
          aria-label={`Appearance rule ${index + 1}`}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium">
              Rule {index + 1}
              {rule.path ? " · selected element" : ""}
            </h3>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy || index === 0}
                onClick={() => move(index, index - 1)}
                aria-label={`Move rule ${index + 1} up`}
              >
                Up
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy || index === fields.length - 1}
                onClick={() => move(index, index + 1)}
                aria-label={`Move rule ${index + 1} down`}
              >
                Down
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove rule ${index + 1}`}
                onClick={() => remove(index)}
              >
                <IconTrash />
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name={`rules.${index}.element`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Element type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={busy}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MANIALINK_STYLE_ELEMENTS.map((element) => (
                        <SelectItem key={element} value={element}>
                          {element === "*" ? "All element types" : element}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(
              [
                ["page", "Widget / window (optional)"],
                ["id", "Element ID (optional)"],
                ["className", "Element class (optional)"],
              ] as const
            ).map(([name, label]) => (
              <FormField
                key={name}
                control={form.control}
                name={`rules.${index}.${name}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
          <div className="space-y-2">
            {Object.keys(rules[index]?.attributes ?? {}).map((key) => {
              const attribute = key as ManialinkStyleAttribute;
              return (
                <div key={attribute} className="flex items-end gap-2">
                  <FormField
                    control={form.control}
                    name={`rules.${index}.attributes.${attribute}`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>
                          {propertyLabels[attribute] ?? attribute}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder={hints[attribute]}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${propertyLabels[attribute] ?? attribute} from rule ${index + 1}`}
                    onClick={() => {
                      const next = {
                        ...form.getValues(`rules.${index}.attributes`),
                      };
                      delete next[attribute];
                      form.setValue(`rules.${index}.attributes`, next, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                  >
                    <IconTrash />
                  </Button>
                </div>
              );
            })}
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.rules?.[index]?.attributes?.message}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${inputId}-${index}`}>
              Add appearance property
            </Label>
            <Select
              value=""
              disabled={busy}
              onValueChange={(value) =>
                form.setValue(
                  `rules.${index}.attributes.${value as ManialinkStyleAttribute}`,
                  "",
                  { shouldDirty: true },
                )
              }
            >
              <SelectTrigger id={`${inputId}-${index}`}>
                <SelectValue placeholder="Choose a property" />
              </SelectTrigger>
              <SelectContent>
                {MANIALINK_STYLE_ATTRIBUTES.filter(
                  (attribute) =>
                    !Object.hasOwn(rules[index]?.attributes ?? {}, attribute),
                ).map((attribute) => (
                  <SelectItem key={attribute} value={attribute}>
                    {propertyLabels[attribute] ?? attribute}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={busy || fields.length >= 50}
        onClick={() =>
          append({
            page: "",
            element: "label",
            id: "",
            className: "",
            attributes: { textsize: "2" },
          })
        }
      >
        <IconPlus />
        Add rule
      </Button>
      <p className="text-sm text-muted-foreground">
        Colors use hexadecimal without #. Fonts and game styles must be
        supported by Trackmania. Plugin scripts can override styling after
        rendering. Removing a property restores its original value on the next
        save.
      </p>
    </>
  );
}
