import {
  ArrowRight,
  Map,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getClient } from "@/lib/dbclient";

const featureCards = [
  {
    icon: ServerCog,
    title: "Server control",
    description:
      "Launch, monitor, and manage your Trackmania servers from one streamlined console.",
    image: "https://i.imgur.com/39jLVUl.png",
  },
  {
    icon: Map,
    title: "Map and match flow",
    description:
      "Handle maps, playlists, and match settings without leaving the dashboard.",
    image: "https://i.imgur.com/5f1zr3E.png",
  },
  {
    icon: Users,
    title: "Player insights",
    description:
      "Keep an eye on players, records, and live activity as events unfold.",
    image: "https://i.imgur.com/huDKrEA.png",
  },
];

async function getPlatformStats() {
  const prisma = getClient();

  const [userCount, serverCount, accessCount] = await Promise.all([
    prisma.users.count({
      where: { authenticated: true },
    }),
    prisma.servers.count({
      where: { deletedAt: null },
    }),
    prisma.userServers.count(),
  ]);

  return {
    userCount,
    serverCount,
    accessCount,
  };
}

export default async function Page() {
  const [session, stats] = await Promise.all([auth(), getPlatformStats()]);
  const overviewStats = [
    { label: "Authenticated users", value: stats.userCount.toString() },
    { label: "Servers managed", value: stats.serverCount.toString() },
    { label: "Server access links", value: stats.accessCount.toString() },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(74,144,255,0.18),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(240,246,255,0.96))] dark:bg-[radial-gradient(circle_at_top_left,rgba(74,144,255,0.2),transparent_35%),linear-gradient(135deg,rgba(10,15,18,0.98),rgba(14,22,24,0.98))]">
      <section className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Sparkles className="size-4" />
            Built for Trackmania admins and organizers
          </div>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Run your server operations with clarity and control.
          </h1>

          <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
            GoControlPanel brings your server health, maps, players, and match
            setup into one polished workspace so you can focus on the race
            instead of the admin work.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={session ? "/dashboard" : "/login"}>
                {session ? "Open dashboard" : "Sign in"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {overviewStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border bg-background/70 p-4 shadow-sm backdrop-blur"
              >
                <p className="text-2xl font-semibold">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-xl rounded-3xl border bg-card/80 p-6 shadow-2xl shadow-primary/10 backdrop-blur">
          <div className="flex items-center justify-between rounded-2xl border bg-background/70 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Control center snapshot</p>
              <p className="text-sm text-muted-foreground">
                Everything needed for a smooth event
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Zap className="size-4" />
              Live
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {[
              {
                title: "Reliable server oversight",
                text: "Track status, uptime, and activity in a single glance.",
              },
              {
                title: "Flexible event controls",
                text: "Adjust maps, playlists, and match rules without friction.",
              },
              {
                title: "Security-first access",
                text: "Protect your environment with role-aware administration.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex gap-3 rounded-2xl border bg-background/60 p-4"
              >
                <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-none px-0 pb-16 sm:px-0 lg:px-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">
              Showcase what your dashboard can do
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              From server oversight to live event coordination, these visuals
              highlight the workflows that keep your operations organized.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto px-2 pb-2 sm:px-4 lg:px-6">
          <div className="mx-auto flex max-w-7xl gap-4 lg:gap-6">
            {featureCards.map((card) => {
              const Icon = card.icon;

              return (
                <Card
                  key={card.title}
                  className="min-w-[min(100%,20rem)] flex-1 overflow-hidden border-border/70 bg-background/80 shadow-lg sm:min-w-88 lg:min-w-96"
                >
                  <img
                    src={card.image}
                    alt={card.title}
                    className="h-64 w-full object-cover sm:h-72 lg:h-80"
                  />
                  <CardHeader>
                    <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle>{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
