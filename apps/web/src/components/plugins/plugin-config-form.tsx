"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  defaultPluginConfig,
  validatePluginConfig,
  type ConfigField,
  type PluginConfig,
  type PluginConfigSchema,
} from "@gcp/shared";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";
import { useState } from "react";

// Form values are strings and booleans; the schema turns them back into config values
type FormValue = string | boolean;

function toFormValue(field: ConfigField, value: unknown): FormValue {
  if (field.type === "boolean") return value === true;
  if (field.type === "array") return Array.isArray(value) ? value.join("\n") : "";
  return value === undefined || value === null ? "" : String(value);
}

function fromFormValue(field: ConfigField, value: FormValue): unknown {
  switch (field.type) {
    case "boolean":
      return value === true;
    case "number":
    case "integer":
      return value === "" ? undefined : Number(value);
    case "array": {
      const items = String(value)
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      return field.items.type === "string" ? items : items.map(Number);
    }
    default:
      return value === "" ? undefined : value;
  }
}

// A form generated from the plugin's config schema (PM-7)
export function PluginConfigForm({
  schema,
  config,
  setSecrets,
  onSave,
  onClose,
}: {
  schema: PluginConfigSchema;
  config: PluginConfig;
  setSecrets: string[];
  onSave: (config: PluginConfig, clearedSecrets: string[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const fields = Object.entries(schema.properties);
  const [values, setValues] = useState<Record<string, FormValue>>(() => {
    const merged = { ...defaultPluginConfig(schema), ...config };
    return Object.fromEntries(
      fields.map(([key, field]) => [key, toFormValue(field, merged[key])]),
    );
  });
  const [cleared, setCleared] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: FormValue) =>
    setValues((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: PluginConfig = {};
    for (const [key, field] of fields) {
      const value = fromFormValue(field, values[key]);
      if (value !== undefined) next[key] = value;
    }

    // Secrets left empty keep their stored value, so they don't count as missing
    const check = validatePluginConfig(
      {
        ...schema,
        required: (schema.required ?? []).filter(
          (key) => !(setSecrets.includes(key) && !cleared.includes(key)),
        ),
      },
      next,
    );
    if (!check.success) {
      setErrors(Object.fromEntries(check.issues.map((i) => [i.path, i.message])));
      return;
    }
    setErrors({});
    setSaving(true);
    const saved = await onSave(check.data, cleared);
    setSaving(false);
    if (saved) onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {fields.map(([key, field]) => {
        const error = errors[key];
        const label = field.title ?? key;
        const required = schema.required?.includes(key);
        const id = `config-${key}`;

        return (
          <div key={key} className="flex flex-col gap-1.5">
            {field.type === "boolean" ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={values[key] === true}
                  onCheckedChange={(checked) => set(key, checked === true)}
                />
                <Label htmlFor={id}>{label}</Label>
              </div>
            ) : (
              <Label htmlFor={id} data-error={!!error}>
                {label}
                {required && (
                  <span className="text-xs text-muted-foreground">(Required)</span>
                )}
              </Label>
            )}
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}

            {field.type === "string" && field.enum ? (
              <Select value={String(values[key] ?? "")} onValueChange={(v) => set(key, v)}>
                <SelectTrigger id={id} className="w-full">
                  <SelectValue placeholder="Choose..." />
                </SelectTrigger>
                <SelectContent>
                  {field.enum.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.type === "string" && field.secret ? (
              <div className="flex gap-2">
                <Input
                  id={id}
                  type="password"
                  autoComplete="off"
                  placeholder={
                    setSecrets.includes(key) && !cleared.includes(key)
                      ? "Saved. Type to replace it"
                      : ""
                  }
                  value={String(values[key] ?? "")}
                  onChange={(e) => set(key, e.target.value)}
                />
                {setSecrets.includes(key) && !cleared.includes(key) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCleared((c) => [...c, key])}
                  >
                    Clear
                  </Button>
                )}
              </div>
            ) : (field.type === "string" && field.multiline) || field.type === "array" ? (
              <textarea
                id={id}
                rows={field.type === "array" ? 4 : 3}
                placeholder={field.type === "array" ? "One per line" : undefined}
                className={cn(
                  "border-input dark:bg-input/30 min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  error && "border-destructive",
                )}
                value={String(values[key] ?? "")}
                onChange={(e) => set(key, e.target.value)}
              />
            ) : field.type !== "boolean" ? (
              <Input
                id={id}
                type={field.type === "number" || field.type === "integer" ? "number" : "text"}
                step={field.type === "integer" ? 1 : "any"}
                min={"minimum" in field ? field.minimum : undefined}
                max={"maximum" in field ? field.maximum : undefined}
                value={String(values[key] ?? "")}
                onChange={(e) => set(key, e.target.value)}
              />
            ) : null}

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
      })}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onClose}>
          <IconX />
          Close
        </Button>
        <Button type="submit" disabled={saving}>
          <IconDeviceFloppy />
          Save
        </Button>
      </div>
    </form>
  );
}
