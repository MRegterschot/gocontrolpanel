"use client";
import { saveCodriverRule } from "@/actions/codriver";
import {
  centsToDollars,
  dollarsToCents,
  invalidateCodriverPanel,
} from "@/components/codriver/panel-format";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import { useSearchUsers } from "@/hooks/use-search-users";
import { getServersMinimal } from "@/lib/api-client/database";
import { fetchPaginated } from "@/lib/api-client/http";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { getErrorMessage } from "@/lib/utils";
import type { CodriverRuleRow } from "@/types/codriver";
import { ServerError } from "@/types/responses";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PanelRuleSchema, PanelRuleSchemaType } from "./panel-rule-schema";

const GROUPS_ENDPOINT = "/api/groups";
const GROUPS_PAGE = { pageIndex: 0, pageSize: 100 };
const GROUPS_SORT = { field: "name", order: "asc" as const };

export default function PanelRuleForm({
  rule,
  callback,
}: {
  // Set when editing; the target is fixed then
  rule?: CodriverRuleRow;
  callback?: () => void;
}) {
  const queryClient = useQueryClient();

  const serversQuery = useQuery({
    queryKey: queryKeys.serversMinimal,
    queryFn: () => unwrap(getServersMinimal(), "GetServersMinimalError"),
    enabled: !rule,
  });
  const groupsQuery = useQuery({
    queryKey: queryKeys.paginated(
      GROUPS_ENDPOINT,
      GROUPS_PAGE,
      GROUPS_SORT,
      "",
    ),
    queryFn: ({ signal }) =>
      unwrap(
        fetchPaginated<{ id: string; name: string }>(
          GROUPS_ENDPOINT,
          GROUPS_PAGE,
          GROUPS_SORT,
          "",
          signal,
        ),
        "GetGroupsError",
      ),
    enabled: !rule,
  });
  useQueryErrorToast(serversQuery.error, "Failed to fetch servers");
  useQueryErrorToast(groupsQuery.error, "Failed to fetch groups");

  const { search, searchResults, searching } = useSearchUsers({});

  const form = useForm<PanelRuleSchemaType>({
    resolver: zodResolver(PanelRuleSchema),
    defaultValues: {
      targetType: rule?.targetType ?? "server",
      targetId: rule?.targetId ?? "",
      effect: rule?.effect ?? "allow",
      useSharedKey: rule?.useSharedKey ?? false,
      budgetDollars: centsToDollars(rule?.sharedMonthlyBudgetCents ?? null),
    },
  });

  const targetType = form.watch("targetType");

  // A picked target belongs to its type, so changing the type clears it
  useEffect(() => {
    const sub = form.watch((_, { name }) => {
      if (name === "targetType") form.setValue("targetId", "");
    });
    return () => sub.unsubscribe();
  }, [form]);

  async function onSubmit(values: PanelRuleSchemaType) {
    try {
      const { error } = await saveCodriverRule({
        targetType: values.targetType,
        targetId: values.targetId,
        effect: values.effect,
        useSharedKey: values.targetType !== "user" && values.useSharedKey,
        sharedMonthlyBudgetCents:
          values.targetType === "user"
            ? null
            : dollarsToCents(values.budgetDollars),
      });
      if (error) {
        throw new ServerError(error, "SaveCodriverRuleError");
      }
      await invalidateCodriverPanel(queryClient);
      toast.success("Rule saved");
      callback?.();
    } catch (error) {
      toast.error("Failed to save the rule", {
        description: getErrorMessage(error),
      });
    }
  }

  const targetOptions =
    targetType === "server"
      ? (serversQuery.data ?? []).map((s) => ({ label: s.name, value: s.id }))
      : (groupsQuery.data?.data ?? []).map((g) => ({
          label: g.name,
          value: g.id,
        }));

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        {rule ? (
          <div className="text-sm">
            <span className="text-muted-foreground capitalize">
              {rule.targetType}:{" "}
            </span>
            {rule.targetName ?? "Deleted"}
          </div>
        ) : (
          <>
            <FormElement
              name="targetType"
              type="select"
              label="Target type"
              options={[
                { label: "Server", value: "server" },
                { label: "Group", value: "group" },
                { label: "User", value: "user" },
              ]}
            />
            {targetType === "user" ? (
              <FormElement
                key="user"
                name="targetId"
                type="search"
                label="User"
                placeholder="Search by login or nickname..."
                onSearch={search}
                isLoading={searching}
                options={searchResults.map((u) => ({
                  label: u.nickName,
                  value: u.id,
                }))}
              />
            ) : (
              <FormElement
                key={targetType}
                name="targetId"
                type="select"
                label={targetType === "server" ? "Server" : "Group"}
                placeholder={`Select a ${targetType}`}
                isLoading={serversQuery.isPending || groupsQuery.isPending}
                options={targetOptions}
              />
            )}
          </>
        )}
        <FormElement
          name="effect"
          type="select"
          label="Effect"
          options={[
            { label: "Allow", value: "allow" },
            { label: "Deny", value: "deny" },
          ]}
        />
        {targetType !== "user" && (
          <>
            <FormElement
              name="useSharedKey"
              type="checkbox"
              label="Use the shared key"
            />
            <FormElement
              name="budgetDollars"
              type="number"
              label="Monthly budget per server (USD)"
              description="Leave empty for no limit."
              placeholder="No limit"
              min={0}
              step={0.01}
            />
          </>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          <IconDeviceFloppy />
          Save rule
        </Button>
      </form>
    </Form>
  );
}
