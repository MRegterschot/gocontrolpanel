"use client";
import { updateUser } from "@/actions/database/users";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import { getRolesMinimal } from "@/lib/api-client/database";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { getErrorMessage, getList, permissions } from "@/lib/utils";
import { ServerError } from "@/types/responses";
import { Users } from "@tmcp/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconClipboardPlus, IconDeviceFloppy } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EditUserSchema, EditUserSchemaType } from "./edit-user-schema";

export default function EditUserForm({
  user,
  callback,
}: {
  user: Users;
  callback?: () => void;
}) {
  const rolesQuery = useQuery({
    queryKey: queryKeys.rolesMinimal,
    queryFn: () => unwrap(getRolesMinimal(), "GetRolesMinimalError"),
  });
  const roles = rolesQuery.data ?? [];
  const loading = rolesQuery.isPending;
  const error = rolesQuery.error
    ? "Failed to get roles: " + getErrorMessage(rolesQuery.error)
    : null;
  useQueryErrorToast(rolesQuery.error, "Failed to fetch roles");

  const form = useForm<EditUserSchemaType>({
    resolver: zodResolver(EditUserSchema),
    defaultValues: {
      admin: user.admin,
      permissions: getList<string>(user.permissions),
    },
  });

  async function onSubmit(values: EditUserSchemaType) {
    try {
      const { error } = await updateUser(user.id, {
        admin: values.admin,
        permissions: getList<string>(values.permissions),
      });
      if (error) {
        throw new ServerError(error, "UpdateUserError");
      }
      toast.success("User successfully updated");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to update user", {
        description: getErrorMessage(error),
      });
    }
  }

  const selectedRole = roles.find((role) => role.id === form.watch("role"));

  if (loading) {
    return <span className="text-muted-foreground">Loading...</span>;
  }

  if (error) {
    return <span>{error}</span>;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormElement
          name={"admin"}
          label="Admin"
          description="Check this box to grant admin privileges to the user."
          className="w-full min-w-64"
          type="checkbox"
        />

        <FormElement
          name={"permissions"}
          label="Permissions"
          description="Select the permissions to assign to the user."
          className="w-full min-w-64"
          type="multi-select"
          max={2}
          options={permissions.map((perm) => ({
            label: perm,
            value: perm,
          }))}
        />

        <div className="flex flex-col gap-2">
          <FormElement
            name={"role"}
            label="Role preset"
            description="Select a role preset to assign multiple permissions at once."
            className="w-full min-w-64"
            type="select"
            options={roles.map((role) => ({
              label: role.name,
              value: role.id,
            }))}
          />

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              form.setValue(
                "permissions",
                getList<string>(selectedRole?.permissions),
              );
            }}
          >
            <IconClipboardPlus />
            Apply Role Preset
          </Button>
        </div>

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={form.formState.isSubmitting}
        >
          <IconDeviceFloppy />
          Save
        </Button>
      </form>
    </Form>
  );
}
