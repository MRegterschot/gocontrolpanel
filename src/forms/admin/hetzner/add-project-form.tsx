"use client";
import { createHetznerProject } from "@/actions/database/hetzner-projects";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form, FormLabel } from "@/components/ui/form";
import { useSearchUsers } from "@/hooks/use-search-users";
import { HetznerProjectRole } from "@/lib/prisma/generated";
import { getErrorMessage, getList } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AddProjectSchema, AddProjectSchemaType } from "./add-project-schema";
import { ServerError } from "@/types/responses";

export default function AddProjectForm({
  callback,
}: {
  callback?: () => void;
}) {
  const { data: session } = useSession();

  const { search, searchResults, searching, loading } = useSearchUsers({
    defaultUsers: session ? [session.user.id] : [],
  });

  const form = useForm<AddProjectSchemaType>({
    resolver: zodResolver(AddProjectSchema),
    defaultValues: {
      hetznerProjectUsers: [
        { userId: session?.user.id, role: HetznerProjectRole.Admin },
      ],
    },
  });

  const { control } = form;
  const {
    fields: userFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "hetznerProjectUsers",
  });

  async function onSubmit(values: AddProjectSchemaType) {
    try {
      const { error } = await createHetznerProject({
        ...values,
        apiTokens: getList<string>(values.apiTokens),
        hetznerProjectUsers:
          values.hetznerProjectUsers?.map((user) => ({
            userId: user.userId,
            role: user.role as HetznerProjectRole,
          })) || [],
      });
      if (error) {
        throw new ServerError(error, "CreateHetznerProjectError");
      }
      toast.success("Project successfully created");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to create project", {
        description: getErrorMessage(error),
      });
    }
  }
  if (loading) {
    return <span className="text-muted-foreground">Loading...</span>;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormElement
          name="name"
          label="Project Name"
          placeholder="Enter project name"
          rootClassName="max-w-full"
          isRequired
        />

        {/* API Tokens */}
        <div className="flex flex-col gap-2">
          <FormLabel className="text-sm">API Tokens</FormLabel>
          {form.watch("apiTokens")?.map((_, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1">
                <FormElement
                  name={`apiTokens.${index}`}
                  className="w-full"
                  placeholder="Enter API token"
                  isRequired
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size={"icon"}
                onClick={() => {
                  const currentTokens = form.getValues("apiTokens");
                  form.setValue(
                    "apiTokens",
                    currentTokens?.filter((_, i) => i !== index),
                  );
                }}
              >
                <IconTrash />
                <span className="sr-only">Remove Token</span>
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const currentTokens = form.getValues("apiTokens") || [];
              form.setValue("apiTokens", [...currentTokens, ""]);
            }}
          >
            <IconPlus />
            Add Token
          </Button>
        </div>

        {/* Users with roles */}
        <div className="flex flex-col gap-2">
          <FormLabel className="text-sm">Users</FormLabel>
          {userFields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <div className="flex-1">
                <FormElement
                  name={`hetznerProjectUsers.${index}.userId`}
                  className="w-full"
                  placeholder="Search user..."
                  onSearch={search}
                  options={searchResults.map((u) => ({
                    label: u.nickName,
                    value: u.id,
                  }))}
                  isLoading={searching}
                  type="search"
                />
              </div>
              <FormElement
                name={`hetznerProjectUsers.${index}.role`}
                className="w-24 sm:w-30"
                placeholder="Select role"
                options={Object.values(HetznerProjectRole).map((role) => ({
                  label: role,
                  value: role,
                }))}
                type="select"
              />
              <Button
                type="button"
                variant="destructive"
                size={"icon"}
                onClick={() => remove(index)}
              >
                <IconTrash />
                <span className="sr-only">Remove User</span>
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({ userId: "", role: HetznerProjectRole.Moderator })
            }
          >
            <IconPlus />
            Add User
          </Button>
        </div>

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={form.formState.isSubmitting}
        >
          <IconPlus />
          Add Project
        </Button>
      </form>
    </Form>
  );
}
