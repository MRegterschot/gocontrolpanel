"use client";
import { deleteCodriverRule } from "@/actions/codriver";
import ConfirmModal from "@/components/modals/confirm-modal";
import Modal from "@/components/modals/modal";
import { DataTable } from "@/components/table/data-table";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/utils";
import type { CodriverRuleRow } from "@/types/codriver";
import { ServerError } from "@/types/responses";
import { IconPlus } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatCents, invalidateCodriverPanel } from "./panel-format";
import PanelRuleModal from "./panel-rule-modal";

function RuleActions({
  rule,
  onDelete,
}: {
  rule: CodriverRuleRow;
  onDelete: (rule: CodriverRuleRow) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Rule actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(rule)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Modal
        isOpen={editOpen}
        setIsOpen={setEditOpen}
        closeOnBackdropClick={false}
      >
        <PanelRuleModal data={rule} />
      </Modal>
    </>
  );
}

export default function PanelRulesCard({
  rules,
}: {
  rules: CodriverRuleRow[];
}) {
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState<CodriverRuleRow | null>(null);

  async function onDelete(rule: CodriverRuleRow) {
    try {
      const { error } = await deleteCodriverRule(rule.id);
      if (error) {
        throw new ServerError(error, "DeleteCodriverRuleError");
      }
      await invalidateCodriverPanel(queryClient);
      toast.success("Rule deleted");
    } catch (error) {
      toast.error("Failed to delete the rule", {
        description: getErrorMessage(error),
      });
    }
  }

  const columns = useMemo<ColumnDef<CodriverRuleRow>[]>(
    () => [
      {
        accessorKey: "targetType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Target type" />
        ),
        cell: ({ row }) => (
          <span className="capitalize">{row.original.targetType}</span>
        ),
      },
      {
        accessorKey: "targetName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Target" />
        ),
        cell: ({ row }) =>
          row.original.targetName ?? (
            <span className="text-muted-foreground">Deleted</span>
          ),
      },
      {
        accessorKey: "effect",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Effect" />
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.original.effect === "deny" ? "destructive" : "default"}
          >
            {row.original.effect === "deny" ? "Deny" : "Allow"}
          </Badge>
        ),
      },
      {
        accessorKey: "useSharedKey",
        header: "Shared key",
        cell: ({ row }) =>
          row.original.targetType === "user"
            ? "—"
            : row.original.useSharedKey
              ? "Yes"
              : "No",
      },
      {
        accessorKey: "sharedMonthlyBudgetCents",
        header: "Shared budget per server",
        cell: ({ row }) =>
          row.original.targetType === "user"
            ? "—"
            : formatCents(row.original.sharedMonthlyBudgetCents),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <RuleActions rule={row.original} onDelete={setToDelete} />
        ),
      },
    ],
    [],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access rules</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <DataTable
          columns={columns}
          data={rules}
          actions={
            <Modal closeOnBackdropClick={false}>
              <PanelRuleModal />
              <Button>
                <IconPlus />
                Add rule
              </Button>
            </Modal>
          }
        />
        <p className="text-sm text-muted-foreground">
          A server rule overrides its groups&apos; rules; any group deny wins
          over group allows; group rules only affect servers, user rules affect
          the user everywhere.
        </p>
      </CardContent>
      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && onDelete(toDelete)}
        title="Delete this rule?"
        description={`The rule for ${toDelete?.targetName ?? "this deleted target"} is removed and the defaults apply again.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </Card>
  );
}
