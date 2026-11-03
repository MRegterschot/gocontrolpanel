"use client";
import * as clients from "@/actions/gbx/clients";
import * as cluster from "@/actions/gbx/cluster";
import ConfirmModal from "@/components/modals/confirm-modal";
import { DataTable } from "@/components/table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getClusterOverview } from "@/lib/api-client/cluster";
import { unwrap } from "@/lib/api-client/query";
import { formatDuration } from "@/lib/utils";
import type { ServerResponse } from "@/types/responses";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { createContext, useContext, useState } from "react";
import { toast } from "sonner";

type Overview = Awaited<ReturnType<typeof getClusterOverview>>["data"];
type Row = Overview["servers"][number];

type Confirmation = {
  title: string;
  description: string;
  action: () => Promise<ServerResponse<void>>;
};

// Changing page state for the row menus; columns stay stable so open menus survive refetches
const ClusterActions = createContext<{
  canManage: boolean;
  pending: boolean;
  mode: Overview["mode"];
  workers: Overview["workers"];
  run: (action: () => Promise<ServerResponse<void>>) => Promise<void>;
  confirm: (confirmation: Confirmation) => void;
} | null>(null);

function ServerActions({ server: s }: { server: Row }) {
  const context = useContext(ClusterActions);
  if (!context) return null;
  const { canManage, pending, mode, workers, run, confirm } = context;
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            disabled={!canManage || pending}
          >
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {s.status && (
            <>
              {!s.status.isConnected && (
                <DropdownMenuItem
                  onSelect={() =>
                    void run(() =>
                      s.status?.isReconnecting
                        ? clients.stopReconnect(s.id)
                        : clients.triggerReconnect(s.id),
                    )
                  }
                >
                  {s.status.isReconnecting
                    ? "Stop reconnecting"
                    : "Trigger reconnect"}
                </DropdownMenuItem>
              )}
              {s.status.isConnected && (
                <>
                  <DropdownMenuItem
                    onSelect={() =>
                      void run(() => clients.disconnectClient(s.id))
                    }
                  >
                    Disconnect
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
          {mode === "cluster" && (
            <>
              {s.owner && workers.some((w) => w.id !== s.owner) && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {workers
                      .filter((w) => w.id !== s.owner)
                      .map((w) => (
                        <DropdownMenuItem
                          key={w.id}
                          onSelect={() =>
                            void run(() => cluster.moveServer(s.id, w.id))
                          }
                        >
                          {w.id}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {!s.owner && !s.held && (
                <>
                  <DropdownMenuItem
                    onSelect={() => void run(() => cluster.claimServer(s.id))}
                  >
                    Claim automatically
                  </DropdownMenuItem>
                  {workers.length > 0 && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        Claim on worker
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {workers.map((w) => (
                          <DropdownMenuItem
                            key={w.id}
                            onSelect={() =>
                              void run(() => cluster.claimServer(s.id, w.id))
                            }
                          >
                            {w.id}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
                </>
              )}
              {s.held ? (
                <DropdownMenuItem
                  onSelect={() => void run(() => cluster.unholdServer(s.id))}
                >
                  Release hold
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={() =>
                    confirm({
                      title: "Hold server",
                      description:
                        "The controller disconnects and nobody reconnects until the hold is released.",
                      action: () => cluster.holdServer(s.id),
                    })
                  }
                >
                  Hold
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name" },
  {
    id: "status",
    header: "Status",
    cell: ({ row: { original: s } }) => (
      <Badge variant="outline">
        {s.held
          ? "Held"
          : !s.status
            ? "Not running"
            : s.status.isConnected
              ? "Connected"
              : s.status.isReconnecting
                ? `Reconnecting in ${Math.max(0, Math.ceil(((s.status.reconnectingAt ?? Date.now()) - Date.now()) / 1000))}s`
                : "Disconnected"}
      </Badge>
    ),
  },
  {
    accessorKey: "owner",
    header: "Owner worker",
    cell: ({ row }) => row.original.owner ?? "—",
  },
  {
    id: "lease",
    header: "Lease time left",
    cell: ({ row }) =>
      row.original.leaseTtlMs === null
        ? "—"
        : `${Math.max(0, Math.ceil(row.original.leaseTtlMs / 1000))}s`,
  },
  {
    id: "actions",
    cell: ({ row }) => <ServerActions server={row.original} />,
  },
];

export default function AdminClusterPage({
  canManage,
}: {
  canManage: boolean;
}) {
  const query = useQuery({
    queryKey: ["admin", "cluster"],
    queryFn: ({ signal }) => unwrap(getClusterOverview(signal)),
    refetchInterval: 3000,
  });
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  async function run(action: () => Promise<ServerResponse<void>>) {
    if (pending) return;
    setPending(true);
    try {
      const result = await action();
      if (result.error) throw new Error(result.error);
      toast.success("Cluster updated");
      setConfirmation(null);
      await query.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setPending(false);
    }
  }
  const data = query.data;
  if (!data) return <p>{query.error?.message ?? "Loading cluster…"}</p>;
  const workers = data.workers;
  return (
    <div className="flex flex-col gap-4">
      {query.error && <p role="alert">{query.error.message}</p>}
      {data.mode === "single" ? (
        <p>Cluster controls require GBX_WORKERS of 1 or more.</p>
      ) : (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Workers</h2>
          {Array.from(new Set(workers.map((w) => w.nodeId))).map((node) => (
            <div key={node} className="rounded border p-4">
              <h3 className="font-semibold">{node}</h3>
              {workers
                .filter((w) => w.nodeId === node)
                .map((w) => (
                  <div
                    key={w.id}
                    className="flex flex-wrap items-center gap-4 py-2"
                  >
                    <span>{w.id}</span>
                    <span>PID: {w.pid ?? "—"}</span>
                    <span>
                      Uptime:{" "}
                      {w.startedAt === null
                        ? "—"
                        : formatDuration(Date.now() - w.startedAt)}
                    </span>
                    <span>{w.servers.length} servers</span>
                    <Button
                      disabled={!canManage || pending}
                      variant="outline"
                      onClick={() =>
                        setConfirmation({
                          title: "Restart worker",
                          description:
                            "Gracefully restart this worker process. Its servers will reconnect.",
                          action: () => cluster.restartWorker(w.id),
                        })
                      }
                    >
                      Restart
                    </Button>
                  </div>
                ))}
            </div>
          ))}
        </section>
      )}
      <ClusterActions.Provider
        value={{
          canManage,
          pending,
          mode: data.mode,
          workers,
          run,
          confirm: setConfirmation,
        }}
      >
        <DataTable
          columns={columns}
          // The service lists servers in Redis scan order
          data={[...data.servers].sort((a, b) => a.name.localeCompare(b.name))}
          getRowId={(row) => row.id}
          filter
        />
      </ClusterActions.Provider>
      {confirmation && (
        <ConfirmModal
          isOpen={!pending}
          onClose={() => {
            if (!pending) setConfirmation(null);
          }}
          onConfirm={() => void run(confirmation.action)}
          title={confirmation.title}
          description={confirmation.description}
          confirmText="Confirm"
          cancelText="Cancel"
        />
      )}
    </div>
  );
}
