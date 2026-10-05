import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GITHUB_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { PublicStats } from "@/services/stats";
import {
  IconAdjustmentsHorizontal,
  IconAlertTriangle,
  IconBrandDiscord,
  IconBrandGithub,
  IconBroadcast,
  IconCloud,
  IconFolders,
  IconHistory,
  IconMap,
  IconPuzzle,
  IconShieldLock,
  IconTrophy,
  IconUsers,
  IconWorldDownload,
} from "@tabler/icons-react";
import Image from "next/image";
import SignInButton from "./sign-in-button";

const DISCORD_URL = "https://discord.gg/NjbtRvbCY8";

const features = [
  {
    icon: IconBroadcast,
    title: "Live match view",
    description:
      "Follow rounds, checkpoints, scores and chat as they happen. Pause the match, set round, map and match points, and talk to players from the browser.",
  },
  {
    icon: IconMap,
    title: "Maps and jukebox",
    description:
      "Add maps from the server, reorder the map list by dragging, jump to a map and queue the next ones in the jukebox.",
  },
  {
    icon: IconWorldDownload,
    title: "Trackmania Exchange and Nadeo",
    description:
      "Search TMX maps and mappacks, or pull in seasonal campaigns, Track of the Day, weekly shorts and club campaigns and rooms, straight onto the server.",
  },
  {
    icon: IconAdjustmentsHorizontal,
    title: "Game and mode settings",
    description:
      "Switch game modes, edit mode script settings, load and save match settings and manage the playlist without touching a file.",
  },
  {
    icon: IconUsers,
    title: "Player management",
    description:
      "Kick, ban, force to spectator, and keep the black list and guest list in order across restarts.",
  },
  {
    icon: IconTrophy,
    title: "Records and matches",
    description:
      "Every round and finish is recorded. Browse match history per map and export results to CSV.",
  },
  {
    icon: IconFolders,
    title: "File manager",
    description:
      "Browse, upload and edit the server's files, match settings and scripts with a built-in code editor.",
  },
  {
    icon: IconShieldLock,
    title: "Roles, groups and audit log",
    description:
      "Give people access to exactly the servers and actions they need. Every change is written to an audit log.",
  },
  {
    icon: IconCloud,
    title: "Hetzner servers",
    description:
      "Set up new dedicated servers, databases, networks and volumes on Hetzner Cloud from the panel, and watch their metrics.",
  },
];

const plugins = [
  {
    name: "Match manager",
    description: "Pick & ban, pausing and match flow for competitions",
  },
  { name: "Live ranking", description: "Standings on screen during the round" },
  { name: "Live round", description: "Who is where, checkpoint by checkpoint" },
  {
    name: "Time Attack leaderboard",
    description: "Best times of the current map",
  },
  { name: "Active runs", description: "Runs in progress in Time Attack" },
  { name: "Map info", description: "Name, author and medals of the map" },
  { name: "Records info", description: "Server records of the map" },
  {
    name: "Player info",
    description: "Details about the players on the server",
  },
  { name: "eCircuitMania", description: "Sends results to eCircuitMania" },
  {
    name: "Admin help",
    description: "Players call an admin, the panel notifies you",
  },
];

const statLabels: { key: keyof PublicStats; label: string }[] = [
  { key: "servers", label: "Servers managed" },
  { key: "players", label: "Players seen" },
  { key: "maps", label: "Maps on servers" },
  { key: "matches", label: "Matches recorded" },
  { key: "records", label: "Finishes recorded" },
];

const errorMessages: Record<string, string> = {
  AccessDenied: "Access was denied. Please try again.",
  OAuthSignin: "Could not start signing in with Ubisoft. Please try again.",
  OAuthCallback: "Ubisoft did not complete the sign in. Please try again.",
  Callback: "Something went wrong while signing you in. Please try again.",
  SessionMissing: "Your sign in did not go through. Please try again.",
};

// Structured data so search engines know this is a free, open-source application
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: `${SITE_URL}/login`,
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  license: "https://opensource.org/licenses/MIT",
  codeRepository: GITHUB_URL,
  author: {
    "@type": "Person",
    name: "Marijn Regterschot",
    url: "https://github.com/MRegterschot",
  },
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const exact = new Intl.NumberFormat("en");

export default function LandingPage({
  stats,
  callbackUrl,
  error,
}: {
  stats: PublicStats | null;
  callbackUrl: string;
  error?: string;
}) {
  const errorMessage = error
    ? (errorMessages[error] ?? "Signing in failed. Please try again.")
    : null;

  return (
    <div className="min-h-svh bg-background text-foreground">
      <script
        type="application/ld+json"
        // "<" escaped so the JSON can't close the script tag
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a href="#" className="flex items-center gap-2 text-white">
            <BrandMark className="size-9 shrink-0" />
            <span className="text-lg font-bold">TMControlPanel</span>
          </a>
          <nav
            aria-label="Main"
            className="flex items-center gap-1 text-sm text-white/80"
          >
            <a
              href="#features"
              className="hidden rounded-md px-3 py-2 hover:text-white sm:block"
            >
              Features
            </a>
            <a
              href="#plugins"
              className="hidden rounded-md px-3 py-2 hover:text-white sm:block"
            >
              Plugins
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-md p-2 hover:text-white"
              aria-label="TMControlPanel on GitHub"
            >
              <IconBrandGithub className="size-5" />
            </a>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative isolate flex min-h-[min(92svh,56rem)] items-center overflow-hidden">
          <Image
            src="/tm-background.png"
            alt=""
            fill
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
            // Softened so the in-game HUD in the screenshot doesn't compete with the text
            className="-z-20 scale-105 object-cover blur-[3px]"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/70 to-black/40"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-transparent via-70% to-background"
          />

          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-24 pt-32 sm:px-6">
            <Badge
              variant="outline"
              className="border-white/20 bg-white/10 px-3 py-1 text-white backdrop-blur-sm"
            >
              Open source · Self-hosted · Free
            </Badge>

            <div className="flex max-w-3xl flex-col gap-5">
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
                Run your Trackmania servers{" "}
                <span className="text-primary">from one panel</span>
              </h1>
              <p className="max-w-2xl text-lg text-white/80">
                TMControlPanel manages your dedicated servers from the browser:
                live matches, maps, players, plugins and files, for one server
                or a whole league, together with your team.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="flex max-w-xl items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/20 p-4 text-sm text-white backdrop-blur-sm"
              >
                <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SignInButton callbackUrl={callbackUrl} />
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20",
                )}
              >
                <IconBrandGithub />
                View on GitHub
              </a>
            </div>
            <p className="text-sm text-white/60">
              Sign in with the Ubisoft account you play Trackmania with.
            </p>
          </div>
        </section>

        {/* Stats */}
        {stats && (
          <section
            aria-label="TMControlPanel in numbers"
            className="relative z-10 -mt-16"
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <Card className="grid grid-cols-2 gap-0 divide-border p-0 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
                {statLabels.map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1 p-6">
                    <span
                      className="text-3xl font-bold tabular-nums text-primary"
                      title={exact.format(stats[key])}
                    >
                      {compact.format(stats[key])}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {label}
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          </section>
        )}

        {/* Features */}
        <section id="features" className="scroll-mt-8 py-24">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything a server admin does, in one place
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="flex flex-col gap-3 p-6">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Plugins */}
        <section
          id="plugins"
          className="scroll-mt-8 border-y bg-muted/40 py-24"
        >
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_2fr]">
            <div className="flex flex-col gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <IconPuzzle className="size-5" />
              </span>
              <h2 className="text-3xl font-bold tracking-tight">
                In-game plugins included
              </h2>
              <p className="text-muted-foreground">
                Turn widgets on per server and change their settings from the
                panel. Changes show up in game right away, no restart needed.
              </p>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {plugins.map((plugin) => (
                <li
                  key={plugin.name}
                  className="flex flex-col gap-1 rounded-lg border bg-background p-4"
                >
                  <span className="font-medium">{plugin.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {plugin.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="py-24">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center sm:px-6">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <IconHistory className="size-6" />
            </span>
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to take over your server?
            </h2>
            <p className="text-muted-foreground">
              Sign in to see the servers you have access to. Running your own?
              TMControlPanel ships as a Docker image that sits next to your
              dedicated server, standalone or alongside PyPlanet and EvoSC.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <SignInButton callbackUrl={callbackUrl} />
              <a
                href={`${GITHUB_URL}#docker-setup`}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Self-host it
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span>
            TMControlPanel · MIT licensed · Not affiliated with Ubisoft Nadeo
          </span>
          <div className="flex items-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              <IconBrandGithub className="size-4" />
              GitHub
            </a>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              <IconBrandDiscord className="size-4" />
              Discord
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
