"use client";
import { createRole } from "@/actions/database/roles";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage, getList, permissions } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AddRoleSchema, AddRoleSchemaType } from "./add-role-schema";
import { ServerError } from "@/types/responses";

export default function AddRoleForm({ callback }: { callback?: () => void }) {
  const form = useForm<AddRoleSchemaType>({
    resolver: zodResolver(AddRoleSchema),
  });

  async function onSubmit(values: AddRoleSchemaType) {
    try {
      const { error } = await createRole({
        ...values,
        description: values.description || null,
        permissions: getList<string>(values.permissions),
      });
      if (error) {
        throw new ServerError(error, "CreateRoleError");
      }
      toast.success("Role successfully added");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to add role", {
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
          options={permissions.map((perm) => ({
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
          <IconPlus />
          Add Role
        </Button>
      </form>
    </Form>
  );
}
