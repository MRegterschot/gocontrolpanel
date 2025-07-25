"use client";
import { createHetznerProject } from "@/actions/database/hetzner-projects";
import { getUsersMinimal, UserMinimal } from "@/actions/database/users";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form, FormLabel } from "@/components/ui/form";
import { HetznerProjectRole } from "@/lib/prisma/generated";
import { getErrorMessage, getList } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AddProjectSchema, AddProjectSchemaType } from "./add-project-schema";

export default function AddProjectForm({
  callback,
}: {
  callback?: () => void;
}) {
  const [users, setUsers] = useState<UserMinimal[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const { data, error } = await getUsersMinimal();
        if (error) {
          throw new Error(error);
        }
        setUsers(data);
      } catch (err) {
        setError("Failed to get users: " + getErrorMessage(err));
        toast.error("Failed to fetch users", {
          description: getErrorMessage(err),
        });
      }

      setLoading(false);
    }

    fetchUsers();
  }, []);

  const form = useForm<AddProjectSchemaType>({
    resolver: zodResolver(AddProjectSchema),
  });

  async function onSubmit(values: AddProjectSchemaType) {
    try {
      const { error } = await createHetznerProject({
        ...values,
        apiTokens: getList(values.apiTokens),
        hetznerProjectUsers:
          values.hetznerProjectUsers?.map((user) => ({
            userId: user.userId,
            role: user.role as HetznerProjectRole,
          })) || [],
      });
      if (error) {
        throw new Error(error);
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
          name="name"
          label="Project Name"
          placeholder="Enter project name"
          isRequired
        />

        {/* API Tokens */}
        <div className="flex flex-col gap-2">
          <FormLabel className="text-sm">API Tokens</FormLabel>
          {form.watch("apiTokens")?.map((_, index) => (
            <div key={index} className="flex items-end gap-2">
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
          {form.watch("hetznerProjectUsers")?.map((_, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1">
                <FormElement
                  name={`hetznerProjectUsers.${index}.userId`}
                  className="w-full"
                  placeholder="Select user"
                  options={users.map((u) => ({
                    label: u.nickName,
                    value: u.id,
                  }))}
                  type="select"
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
                onClick={() => {
                  const currentUsers = form.getValues("hetznerProjectUsers");
                  form.setValue(
                    "hetznerProjectUsers",
                    currentUsers?.filter((_, i) => i !== index),
                  );
                }}
              >
                <IconTrash />
                <span className="sr-only">Remove User</span>
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const currentUsers = form.getValues("hetznerProjectUsers") || [];
              form.setValue("hetznerProjectUsers", [
                ...currentUsers,
                { userId: "", role: HetznerProjectRole.Moderator },
              ]);
            }}
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
          Save
        </Button>
      </form>
    </Form>
  );
}
