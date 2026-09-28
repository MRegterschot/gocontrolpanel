'use client'
import CompetitionGraph from "@/components/tournaments/competitions/graph/competition-graph";
import CompetitionPermissions from "@/components/tournaments/competitions/servers/competition-permissions";
import CompetitionServerPool from "@/components/tournaments/competitions/servers/competition-server-pool";
import CompetitionSharedConfigs from "@/components/tournaments/competitions/servers/competition-shared-configs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSpacetimeProcedure } from "@/hooks/tournaments/use-spacetime-procedure";
import { procedures, tables } from "@/lib/server-manager";
import { IconAccessible, IconArrowLeft, IconLockAccess, IconPremiumRights, IconServer, IconSettings } from "@tabler/icons-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useProcedure, useTable } from "spacetimedb/react";


export default function CompetitionPage({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const { id } = React.use(params);
  const competition = useProcedure(procedures.unstableCompetition)

  const { data: comp, isLoading } = useSpacetimeProcedure(competition, { competitionId: id })

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading competition info...</div>;
  }

  if (comp === undefined || comp === null) {
    return <div>Competition not found</div>
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Competition: {comp.name}</h1>
        <h4 className="text-muted-foreground">
          Manage the competition graph as well as available servers, configs and permissions.
        </h4>
      </div>

      <div className="flex gap-4">

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <IconServer />
              Servers</Button>
          </DialogTrigger>

          <DialogContent className="rounded-lg shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Competition Server Pool</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                The available servers for this competition.
              </DialogDescription>
            </DialogHeader>

            <CompetitionServerPool id={id} />
          </DialogContent>
        </Dialog>


        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <IconSettings />
              Shared Configs
            </Button>
          </DialogTrigger>

          <DialogContent className="rounded-lg shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Shared Competition Configs</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                The available shared configs which can be applied to matches and servers in the competition.
              </DialogDescription>
            </DialogHeader>

            <CompetitionSharedConfigs id={id} />
          </DialogContent>
        </Dialog>


        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <IconLockAccess />
              Permissions
            </Button>
          </DialogTrigger>

          <DialogContent className="rounded-lg shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Competition Permissions</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Permissions for the competition (also is inherited downwards).
              </DialogDescription>
            </DialogHeader>

            <CompetitionPermissions id={id} />
          </DialogContent>
        </Dialog>

      </div>

      <CompetitionGraph competition={comp} />
    </div>
  );
}
