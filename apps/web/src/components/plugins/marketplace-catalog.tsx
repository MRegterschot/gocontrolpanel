"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generatePath } from "@/lib/utils";
import { routes } from "@/routes";
import type { CatalogPlugin, Marketplace } from "@/types/plugins/catalog";
import { describeCapability, GAME_MODE_TYPES } from "@gcp/shared";
import {
  IconAlertTriangle,
  IconBrandGithub,
  IconPuzzle,
  IconSearch,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const ALL = "all";

export function PluginIcon({ src, name }: { src: string | null; name: string }) {
  return src ? (
    <Image
      src={src}
      alt={`${name} icon`}
      width={40}
      height={40}
      unoptimized
      className="size-10 rounded-md object-cover shrink-0"
    />
  ) : (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
      <IconPuzzle className="size-5" />
    </span>
  );
}

function PluginCard({ plugin }: { plugin: CatalogPlugin }) {
  const risky = (plugin.latest?.capabilities ?? []).filter(
    (c) => describeCapability(c).risk === "high",
  );

  return (
    <Link href={generatePath(routes.plugins.detail, { slug: plugin.slug })}>
      <Card className="flex h-full flex-col gap-3 p-4 transition-colors hover:bg-accent/50">
        <div className="flex items-start gap-3">
          <PluginIcon src={plugin.icon} name={plugin.name} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{plugin.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {plugin.author}
              {plugin.latest && ` · ${plugin.latest.version}`}
            </span>
          </div>
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">{plugin.description}</p>
        <div className="mt-auto flex flex-wrap gap-1">
          {plugin.installedOn > 0 && (
            <Badge>
              Installed on {plugin.installedOn} server{plugin.installedOn === 1 ? "" : "s"}
            </Badge>
          )}
          {!plugin.latest && <Badge variant="outline">Needs a newer panel</Badge>}
          {risky.length > 0 && (
            <Badge variant="destructive">
              <IconAlertTriangle />
              {risky.map((c) => describeCapability(c).label).join(", ")}
            </Badge>
          )}
          {plugin.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </Card>
    </Link>
  );
}

export default function MarketplaceCatalog({ marketplace }: { marketplace: Marketplace }) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState(ALL);

  const plugins = useMemo(() => {
    const query = search.trim().toLowerCase();
    return marketplace.plugins.filter((plugin) => {
      const modes = plugin.latest?.gamemodes ?? [];
      if (mode !== ALL && modes.length > 0 && !modes.includes(mode as never)) return false;
      if (!query) return true;
      return [plugin.name, plugin.description, plugin.author, plugin.slug, ...plugin.tags].some(
        (text) => text.toLowerCase().includes(query),
      );
    });
  }, [marketplace.plugins, search, mode]);

  if (!marketplace.enabled) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Browsing the marketplace is turned off on this panel (MARKETPLACE_INDEX_URL is empty).
        Uploaded plugins still work.
      </Card>
    );
  }

  if (marketplace.error) {
    return (
      <Card className="flex flex-row items-start gap-3 p-6 text-sm">
        <IconAlertTriangle className="size-5 shrink-0 text-destructive" />
        <div className="flex flex-col gap-1">
          <span className="font-medium">The marketplace can&apos;t be reached right now</span>
          <span className="text-muted-foreground">{marketplace.error}</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search plugins"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All game modes</SelectItem>
            {GAME_MODE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {plugins.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {marketplace.plugins.length === 0
            ? "The marketplace has no plugins yet."
            : "No plugins match your search."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plugins.map((plugin) => (
            <PluginCard key={plugin.slug} plugin={plugin} />
          ))}
        </div>
      )}

      {marketplace.repository && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <IconBrandGithub className="size-4" />
          Plugins are reviewed through pull requests on
          <a
            href={marketplace.repository}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {marketplace.repository.replace("https://github.com/", "")}
          </a>
        </p>
      )}
    </div>
  );
}
