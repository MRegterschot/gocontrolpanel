import { CapabilityList } from "@/components/plugins/capability-list";
import { PluginMarkdown } from "@/components/plugins/markdown";
import { PluginIcon } from "@/components/plugins/marketplace-catalog";
import { MarketplaceInstallButton } from "@/components/plugins/marketplace-install";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { hasPermission } from "@/lib/auth";
import { cn, generatePath } from "@/lib/utils";
import { routePermissions, routes } from "@/routes";
import { getMarketplacePlugin } from "@/services/plugins";
import {
  IconAlertTriangle,
  IconBrandGithub,
  IconExternalLink,
  IconFlag,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

export default async function MarketplacePluginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await hasPermission(routePermissions.plugins.view))) redirect(routes.dashboard);

  const { data: plugin, error } = await getMarketplacePlugin(slug);
  if (error) {
    return (
      <Card className="flex flex-row items-start gap-3 p-6 text-sm">
        <IconAlertTriangle className="size-5 shrink-0 text-destructive" />
        <span>{error}</span>
      </Card>
    );
  }
  if (!plugin) notFound();

  const latest = plugin.latest;
  const installedOn = plugin.servers.filter((s) => s.installed?.source === "marketplace");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <PluginIcon src={plugin.icon} name={plugin.name} />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">{plugin.name}</h1>
            <span className="text-sm text-muted-foreground">
              by {plugin.author}
              {latest && ` · version ${latest.version}`}
              {plugin.license && ` · ${plugin.license}`}
            </span>
            <p className="max-w-2xl text-muted-foreground">{plugin.description}</p>
            <div className="flex flex-wrap gap-1">
              {plugin.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <MarketplaceInstallButton plugin={plugin} />
          {plugin.repository && (
            <a href={plugin.repository} {...external} className={buttonVariants({ variant: "outline" })}>
              <IconBrandGithub />
              Source
            </a>
          )}
          {plugin.homepage && (
            <a href={plugin.homepage} {...external} className={buttonVariants({ variant: "outline" })}>
              <IconExternalLink />
              Website
            </a>
          )}
          {plugin.reportUrl && (
            <a href={plugin.reportUrl} {...external} className={buttonVariants({ variant: "ghost" })}>
              <IconFlag />
              Report
            </a>
          )}
        </div>
      </div>

      {plugin.conflict && (
        <Card className="flex flex-row items-center gap-3 p-4 text-sm">
          <IconAlertTriangle className="size-5 shrink-0 text-amber-500" />
          {plugin.conflict} It can&apos;t be installed from the marketplace on this panel.
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="p-6">
            {plugin.readme ? (
              <PluginMarkdown>{plugin.readme}</PluginMarkdown>
            ) : (
              <p className="text-sm text-muted-foreground">This plugin has no README.</p>
            )}
          </Card>

          {plugin.screenshots.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {plugin.screenshots.map((src, i) => (
                <a key={src} href={src} {...external}>
                  <Image
                    src={src}
                    alt={`${plugin.name} screenshot ${i + 1}`}
                    width={640}
                    height={360}
                    unoptimized
                    className="w-full rounded-md border object-cover"
                  />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="font-semibold">Permissions</h2>
            {latest ? (
              <CapabilityList capabilities={latest.capabilities} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No version of this plugin runs on this panel yet.
              </p>
            )}
          </Card>

          {latest && (
            <Card className="flex flex-col gap-2 p-6 text-sm">
              <h2 className="font-semibold">Details</h2>
              <span>
                <span className="text-muted-foreground">Game modes: </span>
                {latest.gamemodes.length > 0 ? latest.gamemodes.join(", ") : "all"}
              </span>
              <span>
                <span className="text-muted-foreground">Chat commands: </span>
                {latest.commands.length > 0
                  ? latest.commands.map((c) => `/${c}`).join(", ")
                  : "none"}
              </span>
              <span>
                <span className="text-muted-foreground">Size: </span>
                {(latest.size / 1024).toFixed(1)} KB
              </span>
            </Card>
          )}

          {installedOn.length > 0 && (
            <Card className="flex flex-col gap-2 p-6 text-sm">
              <h2 className="font-semibold">Installed on</h2>
              {installedOn.map((server) => (
                <Link
                  key={server.id}
                  href={generatePath(routes.servers.plugins, { id: server.id })}
                  className="flex justify-between gap-2 hover:underline"
                >
                  <span className="truncate">{server.name}</span>
                  <span className="text-muted-foreground">
                    {server.installed?.version}
                    {!server.installed?.enabled && " (off)"}
                  </span>
                </Link>
              ))}
            </Card>
          )}

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="font-semibold">Versions</h2>
            {plugin.versions.map((version) => (
              <div key={version.version} className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium", version.yanked && "line-through")}>
                    {version.version}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(version.publishedAt).toLocaleDateString()}
                  </span>
                  {version.yanked && <Badge variant="destructive">Withdrawn</Badge>}
                  {!version.compatible && <Badge variant="outline">Needs a newer panel</Badge>}
                </div>
                {version.yanked && version.yankReason && (
                  <span className="text-xs text-destructive">{version.yankReason}</span>
                )}
                {version.changelog && (
                  <span className="whitespace-pre-line text-xs text-muted-foreground">
                    {version.changelog}
                  </span>
                )}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
