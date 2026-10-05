"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUploadButton } from "@/components/ui/file-upload-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import { useSearchUsers } from "@/hooks/use-search-users";
import { getScripts } from "@/lib/api-client/filemanager";
import { getLocalMaps } from "@/lib/api-client/gbx";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { getErrorMessage } from "@/lib/utils";
import {
  validatePluginConfig,
  type ConfigField,
  type PluginConfig,
  type PluginConfigSchema,
} from "@gcp/shared";
import { Root as Tabs } from "@radix-ui/react-tabs";
import {
  IconDeviceFloppy,
  IconDownload,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Papa from "papaparse";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

type ObjectField = Extract<ConfigField, { type: "object" }>;

function initialValue(
  field: ConfigField,
  value: unknown,
  login?: string,
): unknown {
  if (field.type === "object") {
    const raw =
      value && typeof value === "object" ? (value as PluginConfig) : {};
    return Object.fromEntries(
      Object.entries(field.properties).map(([key, child]) => [
        key,
        initialValue(child, raw[key], login),
      ]),
    );
  }
  if (field.type === "array") {
    const items = Array.isArray(value)
      ? value
      : (field.default ??
        (field.defaultFrom === "current-user" && login ? [login] : []));
    return items.map((item) => initialValue(field.items, item, login));
  }
  return value ?? field.default ?? (field.type === "boolean" ? false : "");
}

function hasWidget(field: ConfigField, widget: string): boolean {
  if (field.type === "object")
    return Object.values(field.properties).some((child) =>
      hasWidget(child, widget),
    );
  if (field.type === "array") return hasWidget(field.items, widget);
  return field.type === "string" && field.widget === widget;
}

function UserField({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
}) {
  const { search, searchResults, loading } = useSearchUsers({
    defaultUsers: value ? [value] : [],
    field: "login",
  });
  return (
    <SearchInput
      id={id}
      value={value}
      onValueChange={onChange}
      onSearch={search}
      loading={loading}
      searchResults={searchResults.map((user) => ({
        label: user.nickName,
        value: user.login,
      }))}
    />
  );
}

// The same renderer handles registry and private plugins. Labels, lists, selectors,
// defaults and conditions are declared by the installed package, never by slug.
export function PluginConfigForm({
  schema,
  config,
  setSecrets,
  serverId,
  onSave,
  onClose,
  onExport,
}: {
  schema: PluginConfigSchema;
  config: PluginConfig;
  setSecrets: string[];
  serverId?: string;
  onSave: (config: PluginConfig, clearedSecrets: string[]) => Promise<boolean>;
  onClose: () => void;
  onExport?: () => Promise<void>;
}) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(schema.tabs?.[0]?.id);
  const id = useId();
  const rowIds = useRef<Record<string, string[]>>({});
  const [values, setValues] = useState<PluginConfig>(
    () => initialValue(schema, config, session?.user.login) as PluginConfig,
  );
  const [cleared, setCleared] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const mapsQuery = useQuery({
    queryKey: queryKeys.localMaps(serverId ?? ""),
    queryFn: () => unwrap(getLocalMaps(serverId!), "GetLocalMapsError"),
    enabled: !!serverId && hasWidget(schema, "map"),
  });
  const scriptsQuery = useQuery({
    queryKey: queryKeys.scripts(serverId ?? ""),
    queryFn: () => unwrap(getScripts(serverId!), "GetScriptsError"),
    enabled: !!serverId && hasWidget(schema, "script"),
  });
  useQueryErrorToast(mapsQuery.error, "Failed to load local maps");
  useQueryErrorToast(scriptsQuery.error, "Failed to load scripts");
  const maps = mapsQuery.data ?? [];
  const scripts = scriptsQuery.data ?? [];

  function set(path: string[], value: unknown) {
    setValues((current) => {
      const next = structuredClone(current);
      let parent: any = next;
      for (const key of path.slice(0, -1)) parent = parent[key];
      parent[path.at(-1)!] = value;
      return next;
    });
    setErrors({});
  }

  const validationSchema = {
    ...schema,
    required: (schema.required ?? []).filter(
      (key) => !(setSecrets.includes(key) && !cleared.includes(key)),
    ),
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const check = validatePluginConfig(validationSchema, values);
    if (!check.success) {
      const property = check.issues[0]?.path.split(".")[0];
      const tab = schema.tabs?.find((tab) => tab.properties.includes(property));
      if (tab) setActiveTab(tab.id);
      setErrors(
        Object.fromEntries(
          check.issues.map((issue) => [issue.path, issue.message]),
        ),
      );
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (await onSave(check.data, cleared)) onClose();
    } finally {
      setSaving(false);
    }
  }

  async function importConfig(file?: File) {
    if (!file) return;
    try {
      const check = validatePluginConfig(
        validationSchema,
        JSON.parse(await file.text()),
      );
      if (!check.success)
        throw new Error(
          check.issues
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("; "),
        );
      rowIds.current = {};
      setValues(
        initialValue(schema, check.data, session?.user.login) as PluginConfig,
      );
      setErrors({});
      toast.success("Config imported successfully");
    } catch (error) {
      toast.error("Failed to import config", {
        description: getErrorMessage(error),
      });
    }
  }

  function renderObject(
    field: ObjectField,
    value: PluginConfig,
    path: string[],
    rowAction?: React.ReactNode,
  ) {
    return Object.entries(field.properties)
      .filter(
        ([, child]) =>
          !child.visibleWhen ||
          value[child.visibleWhen.property] === child.visibleWhen.equals,
      )
      .map(([key, child], index) => {
        return renderField(
          child,
          value[key],
          [...path, key],
          field.required?.includes(key),
          undefined,
          index === 0 ? rowAction : undefined,
        );
      });
  }

  function renderField(
    field: ConfigField,
    value: unknown,
    path: string[],
    required = false,
    stableKey?: string,
    rowAction?: React.ReactNode,
  ): React.ReactNode {
    const key = path.join(".");
    const inputId = `${id}-${key}`;
    const label = field.title ?? path.at(-1)!;
    const error = errors[key];
    const update = (next: unknown) => set(path, next);
    let control: React.ReactNode;
    if (field.type === "object") {
      control = (
        <div className="flex w-full min-w-0 flex-col gap-4">
          {renderObject(field, (value as PluginConfig) ?? {}, path, rowAction)}
        </div>
      );
    } else if (field.type === "array") {
      const items = Array.isArray(value) ? value : [];
      const keys = (rowIds.current[key] ??= []);
      while (keys.length < items.length) keys.push(crypto.randomUUID());
      keys.length = items.length;
      const rows =
        !!field.addLabel ||
        field.items.type === "object" ||
        field.items.type === "array" ||
        (field.items.type === "string" && !!field.items.widget);
      control = rows ? (
        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <div key={keys[index]} className="min-w-0 w-full">
              {renderField(
                field.items,
                item,
                [...path, String(index)],
                true,
                keys[index],
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  aria-label={`Remove ${label} item ${index + 1}`}
                  onClick={() => {
                    keys.splice(index, 1);
                    update(items.filter((_, i) => i !== index));
                  }}
                >
                  <IconTrash />
                </Button>,
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={items.length >= (field.maxItems ?? 500)}
            onClick={() => {
              const next = initialValue(field.items, undefined) as any;
              if (
                field.items.type === "object" &&
                "seed" in field.items.properties &&
                next.seed === ""
              )
                next.seed = items.length + 1;
              update([...items, next]);
            }}
          >
            <IconPlus />
            {field.addLabel ?? "Add Item"}
          </Button>
          {field.items.type === "string" && field.items.widget === "map" && (
            <Select
              value=""
              onValueChange={(folder) =>
                update(
                  maps
                    .filter(
                      (map) =>
                        (map.FileName.substring(
                          0,
                          map.FileName.lastIndexOf("/"),
                        ) || "root") === folder,
                    )
                    .map((map) => map.FileName),
                )
              }
            >
              <SelectTrigger className="w-full" aria-label="Select Folder">
                <SelectValue placeholder="Select Folder" />
              </SelectTrigger>
              <SelectContent>
                {[
                  ...new Set(
                    maps.map(
                      (map) =>
                        map.FileName.substring(
                          0,
                          map.FileName.lastIndexOf("/"),
                        ) || "root",
                    ),
                  ),
                ].map((folder) => (
                  <SelectItem key={folder} value={folder}>
                    {folder}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {field.csv && (
            <FileUploadButton
              className="w-full"
              accept=".csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                Papa.parse<Record<string, string>>(file, {
                  header: true,
                  skipEmptyLines: true,
                  complete: (result) => {
                    if (result.errors.length) {
                      toast.error("Failed to import CSV", {
                        description: result.errors[0].message,
                      });
                      return;
                    }
                    const imported = result.data.map((row, index) => ({
                      ...Object.fromEntries(
                        Object.entries(field.csv!.columns).map(
                          ([property, column]) => [
                            property,
                            row[column]?.trim() ?? "",
                          ],
                        ),
                      ),
                      ...Object.fromEntries(
                        Object.entries(field.csv!.lists ?? {}).map(
                          ([property, columns]) => [
                            property,
                            columns
                              .map((column) => row[column]?.trim())
                              .filter(Boolean),
                          ],
                        ),
                      ),
                      ...(field.csv!.seed
                        ? { [field.csv!.seed]: index + 1 }
                        : {}),
                    }));
                    const check = validatePluginConfig(
                      { type: "object", properties: { list: field } },
                      { list: imported },
                    );
                    if (!check.success) {
                      toast.error("Failed to import CSV", {
                        description: check.issues
                          .map((issue) => issue.message)
                          .join("; "),
                      });
                      return;
                    }
                    update(check.data.list);
                  },
                });
                event.target.value = "";
              }}
            >
              Import CSV
            </FileUploadButton>
          )}
        </div>
      ) : (
        <Textarea
          id={inputId}
          rows={4}
          aria-invalid={!!error}
          placeholder="One per line"
          value={items.join("\n")}
          onChange={(event) =>
            update(
              event.target.value
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean)
                .map((item) =>
                  field.items.type === "string" ? item : Number(item),
                ),
            )
          }
        />
      );
    } else if (field.type === "boolean") {
      control = (
        <div className="flex items-center gap-2">
          <Checkbox
            id={inputId}
            checked={value === true}
            onCheckedChange={(checked) => update(checked === true)}
          />
          <Label htmlFor={inputId}>{label}</Label>
        </div>
      );
    } else if (field.type === "string" && field.widget === "user") {
      control = (
        <UserField id={inputId} value={String(value ?? "")} onChange={update} />
      );
    } else if (field.type === "string" && field.widget === "order") {
      const steps = String(value ?? "")
        .split(",")
        .filter(Boolean);
      const limit = field.maxItemsFrom
        ?.split(".")
        .reduce<any>((parent, part) => parent?.[part], values);
      control = (
        <div className="flex flex-col gap-2">
          {steps.map((step, index) => {
            const [action, seed] = step.split(":");
            const changeStep = (next: string) =>
              update(
                steps.map((old, i) => (i === index ? next : old)).join(","),
              );
            return (
              <div key={index} className="flex gap-2">
                <Select
                  value={action}
                  onValueChange={(next) =>
                    changeStep(next === "r" ? "r" : `${next}:${seed ?? 1}`)
                  }
                >
                  <SelectTrigger
                    className="flex-1"
                    aria-label={`Step ${index + 1} action`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="p">Pick</SelectItem>
                    <SelectItem value="b">Ban</SelectItem>
                    <SelectItem value="r">Random</SelectItem>
                  </SelectContent>
                </Select>
                {action !== "r" && (
                  <Input
                    aria-label={`Step ${index + 1} seed`}
                    className="w-20"
                    type="number"
                    min={1}
                    value={seed ?? 1}
                    onChange={(event) =>
                      changeStep(`${action}:${event.target.value}`)
                    }
                  />
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  aria-label={`Remove step ${index + 1}`}
                  onClick={() =>
                    update(steps.filter((_, i) => i !== index).join(","))
                  }
                >
                  <IconTrash />
                </Button>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={
              field.maxItemsFrom
                ? steps.length >= (Array.isArray(limit) ? limit.length : 0)
                : false
            }
            onClick={() => update([...steps, "p:1"].join(","))}
          >
            <IconPlus />
            Add Step
          </Button>
        </div>
      );
    } else if (
      field.type === "string" &&
      (field.enum || field.widget === "map" || field.widget === "script")
    ) {
      const options =
        field.enum?.map((option) => ({ label: option, value: option })) ??
        (field.widget === "map"
          ? maps.map((map) => ({ label: map.Name, value: map.FileName }))
          : scripts.map((script) => ({ label: script, value: script })));
      if (value && !options.some((option) => option.value === value))
        options.push({ label: String(value), value: String(value) });
      control = (
        <div className="flex gap-2">
          <Select value={String(value ?? "")} onValueChange={update}>
            <SelectTrigger id={inputId} className="w-full">
              <SelectValue placeholder="Choose..." />
            </SelectTrigger>
            <SelectContent>
              {options
                .filter((option) => option.value)
                .map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {!required && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Clear ${label}`}
              onClick={() => update("")}
            >
              <IconX />
            </Button>
          )}
        </div>
      );
    } else if (field.type === "string" && field.multiline) {
      control = (
        <Textarea
          id={inputId}
          rows={3}
          aria-invalid={!!error}
          value={String(value ?? "")}
          onChange={(event) => update(event.target.value)}
        />
      );
    } else {
      const secret = field.type === "string" && field.secret;
      control = (
        <div className="flex gap-2">
          <Input
            id={inputId}
            aria-invalid={!!error}
            type={
              secret ? "password" : field.type === "string" ? "text" : "number"
            }
            autoComplete={secret ? "off" : undefined}
            step={field.type === "integer" ? 1 : "any"}
            min={"minimum" in field ? field.minimum : undefined}
            max={"maximum" in field ? field.maximum : undefined}
            placeholder={
              secret && setSecrets.includes(key) && !cleared.includes(key)
                ? "Saved. Type to replace it"
                : undefined
            }
            value={String(value ?? "")}
            onChange={(event) =>
              update(
                field.type === "string" || event.target.value === ""
                  ? event.target.value
                  : Number(event.target.value),
              )
            }
          />
          {secret && setSecrets.includes(key) && !cleared.includes(key) && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCleared((current) => [...current, key])}
            >
              Clear
            </Button>
          )}
        </div>
      );
    }
    return (
      <div
        key={stableKey ?? path.at(-1)}
        role={
          field.type === "object" || field.type === "array"
            ? "group"
            : undefined
        }
        aria-label={
          field.type === "object" || field.type === "array" ? label : undefined
        }
        className="flex w-full min-w-0 flex-col gap-1.5"
      >
        {field.type !== "boolean" &&
          field.type !== "object" &&
          field.type !== "array" &&
          (field.title || !/^\d+$/.test(path.at(-1)!)) && (
            <Label htmlFor={inputId}>
              {label}
              {required && (
                <span className="text-xs text-muted-foreground">
                  (Required)
                </span>
              )}
            </Label>
          )}
        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}
        {rowAction && field.type !== "object" ? (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">{control}</div>
            {rowAction}
          </div>
        ) : (
          control
        )}
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {schema.tabs ? (
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col gap-4"
        >
          <TabsList className="w-full" aria-label="Plugin settings sections">
            {schema.tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {schema.tabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="flex flex-col gap-4"
            >
              {renderObject(
                {
                  ...schema,
                  properties: Object.fromEntries(
                    tab.properties.map((key) => [key, schema.properties[key]]),
                  ),
                },
                values,
                [],
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        renderObject(schema, values, [])
      )}
      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          <IconX />
          Close
        </Button>
        <div className="flex flex-wrap gap-2">
          {onExport && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void onExport()}
            >
              <IconDownload />
              Export Config
            </Button>
          )}
          <FileUploadButton
            accept=".json"
            onChange={(event) => {
              void importConfig(event.target.files?.[0]);
              event.target.value = "";
            }}
          >
            Import Config
          </FileUploadButton>
          <Button type="submit" disabled={saving}>
            <IconDeviceFloppy />
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
