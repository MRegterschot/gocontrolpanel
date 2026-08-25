"use client";
import { updateRole } from "@/actions/database/roles";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PERMISSIONS } from "@/lib/permissions";
import { Roles } from "@/lib/prisma/generated";
import { getErrorMessage, getList } from "@/lib/utils";
import { ServerError } from "@/types/responses";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EditRoleSchema, EditRoleSchemaType } from "./edit-role-schema";
export default function EditRoleForm({
  role,
  callback,
}: {
  role: Roles;
  callback?: () => void;
}) {
  const form = useForm<EditRoleSchemaType>({
    resolver: zodResolver(EditRoleSchema),
    defaultValues: {
      name: role.name,
      description: role.description || "",
      permissions: getList<string>(role.permissions),
    },
  });

  async function onSubmit(values: EditRoleSchemaType) {
    try {
      const { error } = await updateRole(role.id, {
        ...values,
        description: values.description || null,
        permissions: getList<string>(values.permissions),
      });
      if (error) {
        throw new ServerError(error, "UpdateRoleError");
      }
      toast.success("Role successfully updated");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to update role", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormElement
          name={"name"}
          label="Name"
          description="The name of the role"
          placeholder="Enter role name"
          className="w-full min-w-64"
          isRequired
        />

        <FormElement
          name={"description"}
          label="Description"
          description="A brief description of the role"
          placeholder="Enter role description"
          className="w-full min-w-64"
        />

        <FormElement
          name={"permissions"}
          label="Permissions"
          description="Select permissions for this role"
          placeholder="Select permissions"
          type="multi-select"
          options={PERMISSIONS.map((perm) => ({
            label: perm,
            value: perm,
          }))}
          className="w-full min-w-64"
        />

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
