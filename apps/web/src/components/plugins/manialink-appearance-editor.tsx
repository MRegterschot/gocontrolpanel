"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePluginManialinks } from "@/hooks/use-plugin-manialinks";
import { manialinkColor } from "@/lib/plugins/manialink-color";
import {
  elementLabel,
  updateElementAppearance,
} from "@/lib/plugins/manialink-preview";
import {
  effectiveAppearance,
  matchingAppearanceAttributes,
  pluginAppearanceSchema,
  type ManialinkElement,
  type ManialinkStyleAttribute,
  type PluginAppearance,
  type ServerAppearance,
} from "@gcp/shared";
import { IconRefresh, IconRestore } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { ManialinkPreview } from "./manialink-preview";

function StyleControl({
  name,
  label,
  value,
  original,
  onChange,
  disabled,
  kind = "text",
  options,
  hint,
}: {
  name: string;
  label: string;
  value: string;
  original?: string;
  onChange: (value: string | undefined) => void;
  disabled: boolean;
  kind?: "text" | "number" | "color" | "pair";
  options?: string[];
  hint?: string;
}) {
  const id = useId();
  const parts = value.split(" ");
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          title={`Reset ${label}`}
          aria-label={`Reset ${label}`}
          disabled={disabled}
          onClick={() => onChange(undefined)}
        >
          <IconRestore className="size-3.5" />
        </Button>
      </div>
      <div className="flex gap-2">
        {kind === "color" && (
          <input
            type="color"
            aria-label={`${label} picker`}
            value={manialinkColor(value).slice(0, 7)}
            disabled={disabled}
            className="h-9 w-10 shrink-0 cursor-pointer rounded border bg-transparent"
            onChange={(event) => {
              const expanded = manialinkColor(value).slice(1);
              onChange(
                event.target.value.slice(1) +
                  (expanded.length === 8 ? expanded.slice(6) : ""),
              );
            }}
          />
        )}
        {kind === "pair" ? (
          <div className="grid w-full grid-cols-2 gap-2">
            {[0, 1].map((index) => (
              <Input
                key={index}
                id={index === 0 ? id : undefined}
                aria-label={`${label} ${index === 0 ? (name === "size" ? "width" : "X") : name === "size" ? "height" : "Y"}`}
                type="number"
                step="any"
                value={parts[index] ?? "0"}
                disabled={disabled}
                onChange={(event) => {
                  const next = [parts[0] ?? "0", parts[1] ?? "0"];
                  next[index] = event.target.value;
                  onChange(next.join(" "));
                }}
              />
            ))}
          </div>
        ) : options ? (
          <Select value={value} disabled={disabled} onValueChange={onChange}>
            <SelectTrigger id={id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={id}
            type={kind === "number" ? "number" : "text"}
            step={kind === "number" ? "any" : undefined}
            value={value}
            disabled={disabled}
            placeholder={hint}
            onChange={(event) =>
              onChange(
                kind === "color"
                  ? event.target.value.replace(/^#/, "")
                  : event.target.value,
              )
            }
          />
        )}
      </div>
      <p className="truncate text-xs text-muted-foreground" title={original}>
        {original !== undefined
          ? `Plugin: ${original || "(empty)"}`
          : "Not specified by the plugin"}
      </p>
    </div>
  );
}

const properties = (
  element: ManialinkElement,
): {
  name: ManialinkStyleAttribute;
  label: string;
  kind?: "text" | "number" | "color" | "pair";
  fallback: string;
  options?: string[];
}[] => [
  { name: "pos", label: "Position", kind: "pair", fallback: "0 0" },
  { name: "size", label: "Size", kind: "pair", fallback: "10 10" },
  { name: "scale", label: "Scale", kind: "number", fallback: "1" },
  { name: "rot", label: "Rotation", kind: "number", fallback: "0" },
  { name: "opacity", label: "Opacity", kind: "number", fallback: "1" },
  { name: "z-index", label: "Layer", kind: "number", fallback: "0" },
  {
    name: "halign",
    label: "Horizontal alignment",
    fallback: "left",
    options: ["left", "center", "right"],
  },
  {
    name: "valign",
    label: "Vertical alignment",
    fallback: "top",
    options: ["top", "center", "center2", "bottom"],
  },
  ...(["label", "entry"].includes(element.tag)
    ? [
        { name: "textfont" as const, label: "Font", fallback: "GameFont" },
        {
          name: "textsize" as const,
          label: "Text size",
          kind: "number" as const,
          fallback: "1",
        },
        {
          name: "textcolor" as const,
          label: "Text color",
          kind: "color" as const,
          fallback: element.attributes.color ?? "FFF",
        },
      ]
    : []),
  ...(element.tag === "quad"
    ? [
        {
          name: "bgcolor" as const,
          label: "Background color",
          kind: "color" as const,
          fallback: "FFF",
        },
        { name: "style" as const, label: "Game style", fallback: "" },
        { name: "substyle" as const, label: "Game substyle", fallback: "" },
      ]
    : []),
];

export function ManialinkAppearanceEditor({
  serverId,
  pluginId,
  serverAppearance,
}: {
  serverId: string;
  pluginId: string;
  serverAppearance: ServerAppearance;
}) {
  const query = usePluginManialinks(serverId, pluginId);
  const form = useFormContext<PluginAppearance>();
  const appearance = form.watch();
  // What players see: the server theme underneath this plugin's overrides
  const effective = effectiveAppearance(serverAppearance, appearance);
  const [pageKey, setPageKey] = useState("");
  const [elementPath, setElementPath] = useState("");
  const [search, setSearch] = useState("");
  const pageId = useId();
  const searchId = useId();
  const key = (page: { id: string; login?: string }) =>
    `${page.id}:${page.login ?? ""}`;
  const pages = query.data?.pages ?? [];
  const page = pages.find((page) => key(page) === pageKey) ?? pages[0];
  const selected =
    page?.elements.find((element) => element.path === elementPath) ??
    page?.elements.find((element) => element.tag === "label") ??
    page?.elements[0];
  const busy = form.formState.isSubmitting;
  const validation = pluginAppearanceSchema.safeParse(appearance);

  function change(name: ManialinkStyleAttribute, value: string | undefined) {
    if (!page || !selected) return;
    const next = updateElementAppearance(
      form.getValues(),
      page,
      selected,
      name,
      value,
    );
    if (next.rules.length > 50) {
      toast.error(
        "The limit is 50 styling rules. Remove an unused rule in Advanced rules first.",
      );
      return;
    }
    form.setValue("rules", next.rules, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }
  return (
    <section className="space-y-4" aria-label="Visual appearance editor">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor={pageId}>Widget or window</Label>
          <Select
            value={page ? key(page) : ""}
            disabled={!pages.length || busy}
            onValueChange={(value) => {
              setPageKey(value);
              setElementPath("");
              setSearch("");
            }}
          >
            <SelectTrigger id={pageId}>
              <SelectValue placeholder="Waiting for a rendered Manialink" />
            </SelectTrigger>
            <SelectContent>
              {pages.map((page) => (
                <SelectItem key={key(page)} value={key(page)}>
                  {page.page}
                  {page.login ? ` · player ${page.login}` : " · everyone"}
                  {page.visible ? "" : " · hidden"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={query.isFetching || busy}
          onClick={() => void query.refetch()}
        >
          <IconRefresh className={query.isFetching ? "animate-spin" : ""} />
          Refresh from server
        </Button>
      </div>
      {query.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading the plugin’s rendered Manialinks…
        </p>
      )}
      {query.isError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 p-3 text-sm"
        >
          Could not load Manialinks: {query.error.message}. You can retry or
          edit the advanced rules below.
        </p>
      )}
      {query.data && pages.length === 0 && (
        <p className="rounded-md border p-4 text-sm">
          {query.data.running
            ? "No rendered UI is available yet. Open the plugin’s widget or window in Trackmania, then refresh."
            : "This plugin is not running. Enable it on a connected server in a supported game mode, then refresh."}
        </p>
      )}
      {query.data?.truncated && (
        <p className="text-sm text-muted-foreground">
          Showing a limited snapshot of this plugin’s UI. Open the relevant
          window and refresh if an element is missing.
        </p>
      )}
      {page && selected && (
        <>
          <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor={searchId}>Elements</Label>
              <Input
                id={searchId}
                placeholder="Find text or element…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div
                className="max-h-80 space-y-1 overflow-y-auto rounded-md border p-1 lg:max-h-[420px]"
                aria-label="Manialink elements"
              >
                {page.elements
                  .filter((element) =>
                    `${elementLabel(element)} ${element.tag} ${element.attributes.class ?? ""} ${element.attributes.id ?? ""}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((element) => (
                    <button
                      type="button"
                      key={element.path}
                      disabled={busy}
                      aria-pressed={element.path === selected.path}
                      onClick={() => setElementPath(element.path)}
                      className={`flex w-full flex-col rounded px-2 py-1.5 text-left text-sm hover:bg-accent ${element.path === selected.path ? "bg-accent text-accent-foreground ring-1 ring-inset ring-primary" : ""}`}
                      style={{
                        paddingLeft: `${Math.min(element.path.split(".").length - 2, 5) * 8 + 8}px`,
                      }}
                    >
                      <span className="max-w-full truncate">
                        {elementLabel(element)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {element.tag}
                        {element.attributes.id
                          ? ` · ${element.attributes.id}`
                          : ""}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
            <ManialinkPreview
              page={page}
              appearance={effective}
              selected={selected.path}
              onSelect={(path) => {
                if (!busy) setElementPath(path);
              }}
            />
          </div>
          <div className="rounded-lg border p-4 space-y-3">
            <div>
              <h3 className="font-medium">{elementLabel(selected)}</h3>
              <p className="text-xs text-muted-foreground">
                Only this element on {page.page}. Player-specific snapshots
                share the same saved styling. Resetting a control reveals the
                plugin value, a broader rule or the server-wide theme.
              </p>
            </div>
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
              {properties(selected).map((property) => {
                const overrides = matchingAppearanceAttributes(
                  page.page,
                  selected,
                  effective,
                );
                return (
                  <StyleControl
                    key={`${key(page)}-${selected.path}-${property.name}`}
                    {...property}
                    value={
                      overrides[property.name] ??
                      selected.attributes[property.name] ??
                      property.fallback
                    }
                    original={selected.attributes[property.name]}
                    disabled={busy}
                    onChange={(value) => change(property.name, value)}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
      {!validation.success && (
        <p role="alert" className="text-sm text-destructive">
          {validation.error.issues[0]?.message}. Check your appearance values
          before saving.
        </p>
      )}
      {query.data && (
        <p className="text-xs text-muted-foreground">
          Captured {new Date(query.data.capturedAt).toLocaleTimeString()}.
          Refresh updates the snapshot and keeps your unsaved styling.
        </p>
      )}
    </section>
  );
}
