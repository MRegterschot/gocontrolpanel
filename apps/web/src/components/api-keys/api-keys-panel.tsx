"use client";

import CreateApiKeyModal from "@/components/modals/api-keys/create-api-key";
import Modal from "@/components/modals/modal";
import { DataTable } from "@/components/table/data-table";
import { Button } from "@/components/ui/button";
import { useGroupApiKeys, useServerApiKeys } from "@/hooks/use-api-keys";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import type { ApiKeyTarget } from "@/lib/api-keys/authenticate";
import { getErrorMessage } from "@/lib/utils";
import { routes } from "@/routes";
import type { ApiKeyRow } from "@/services/database/api-keys";
import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { useMemo } from "react";
import { createApiKeyColumns } from "./api-key-columns";

const MANAGE = { rename: true, revoke: true };
const READ_ONLY = { rename: false, revoke: false };

function KeyTable({
  keys,
  isLoading,
  refetch,
  manage,
  actions,
}: {
  keys: ApiKeyRow[];
  isLoading: boolean;
  refetch: () => void;
  manage: boolean;
  actions?: React.ReactNode;
}) {
  const columns = useMemo(
    () =>
      createApiKeyColumns(refetch, {
        canManage: () => (manage ? MANAGE : READ_ONLY),
      }),
    [refetch, manage],
  );
  return (
    <DataTable
      columns={columns}
      data={keys}
      isLoading={isLoading}
      actions={actions}
      pagination
    />
  );
}

function CreateButton({
  target,
  onCreated,
}: {
  target: ApiKeyTarget;
  onCreated: () => void;
}) {
  return (
    <Modal closeOnBackdropClick={false}>
      <CreateApiKeyModal data={target} onSubmit={onCreated} />
      <Button collapse="sm">
        <IconPlus />
        Create API key
      </Button>
    </Modal>
  );
}

// The keys of one server: its own, which its admins manage, and group keys that reach it
export function ServerApiKeys({ serverId }: { serverId: string }) {
  const query = useServerApiKeys(serverId);
  useQueryErrorToast(query.error, "Failed to fetch API keys");
  const refetch = query.refetch as () => void;
  const target: ApiKeyTarget = { type: "server", serverId };

  if (query.error) {
    return <span>Failed to load API keys: {getErrorMessage(query.error)}</span>;
  }

  return (
    <div className="flex flex-col gap-8">
      <KeyTable
        keys={query.data?.own ?? []}
        isLoading={query.isPending}
        refetch={refetch}
        manage
        actions={<CreateButton target={target} onCreated={refetch} />}
      />

      {(query.data?.viaGroups.length ?? 0) > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Group keys with access</h2>
          <p className="text-sm text-muted-foreground">
            These belong to a group this server is in and are managed by the
            group&apos;s admins in{" "}
            <Link href={routes.admin.groups} className="underline">
              Groups
            </Link>
            .
          </p>
          <KeyTable
            keys={query.data?.viaGroups ?? []}
            isLoading={false}
            refetch={refetch}
            manage={false}
          />
        </div>
      )}
    </div>
  );
}

// The keys of one group; every admin of the group manages all of them
export function GroupApiKeys({ groupId }: { groupId: string }) {
  const query = useGroupApiKeys(groupId);
  useQueryErrorToast(query.error, "Failed to fetch API keys");
  const refetch = query.refetch as () => void;

  if (query.error) {
    return <span>Failed to load API keys: {getErrorMessage(query.error)}</span>;
  }

  return (
    <KeyTable
      keys={query.data ?? []}
      isLoading={query.isPending}
      refetch={refetch}
      manage
      actions={
        <CreateButton target={{ type: "group", groupId }} onCreated={refetch} />
      }
    />
  );
}
