"use client";
import { createServer } from "@/actions/database/servers";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form, FormLabel } from "@/components/ui/form";
import { useSearchUsers } from "@/hooks/use-search-users";
import { UserServerRole } from "@/lib/prisma/generated";
import { getErrorMessage } from "@/lib/utils";
import { HetznerServerCache } from "@/types/api/hetzner/servers";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { DefaultValues, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AddServerSchema, AddServerSchemaType } from "./add-server-schema";

export default function AddServerForm({
  callback,
  recentlyCreatedServers,
}: {
  callback?: () => void;
  recentlyCreatedServers?: HetznerServerCache[];
}) {
  const { data: session } = useSession();

  const { search, searchResults, searching, loading } = useSearchUsers({
    defaultUsers: session ? [session.user.id] : [],
  });

  let defaultValues: DefaultValues<AddServerSchemaType> = {
    port: 5000,
    userServers: [{ userId: session?.user.id, role: UserServerRole.Admin }],
  };

  const server =
    recentlyCreatedServers && recentlyCreatedServers.length > 0
      ? recentlyCreatedServers[0]
      : null;

  if (server) {
    defaultValues = {
      ...defaultValues,
      name: server.name,
      host: server.ip || "",
      port: server.port,
      user: "SuperAdmin",
      password: server.password,
      filemanagerUrl: `http://${server.ip}:${server.fm_port}`,
      filemanagerPassword: server.filemanagerPassword,
    };
  }

  const form = useForm<AddServerSchemaType>({
    resolver: zodResolver(AddServerSchema),
    defaultValues,
  });

  const { control } = form;
  const {
    fields: userFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "userServers",
  });

  async function onSubmit(values: AddServerSchemaType) {
    try {
      const { error } = await createServer(
        {
          ...values,
          description: values.description || "",
          userServers:
            values.userServers?.map((user) => ({
              userId: user.userId,
              role: user.role as UserServerRole,
            })) || [],
          filemanagerUrl: values.filemanagerUrl || "",
          filemanagerPassword: values.filemanagerPassword || "",
        },
        values.host === server?.ip ? server.projectId : undefined,
      );
      if (error) {
        throw new Error(error);
      }
      toast.success("Server successfully added");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to add server", {
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
          name={"name"}
          label="Name"
          description="The name of the server."
          placeholder="Enter server name"
          isRequired
        />

        <FormElement
          name={"description"}
          label="Description"
          description="The description of the server."
          placeholder="Enter server description"
        />

        <FormElement
          name={"host"}
          label="Host"
          description="The host of the server."
          placeholder="Enter server host"
          isRequired
        />

        <FormElement
          name={"port"}
          label="Port"
          description="The XMLRPC port of the server."
          placeholder="Enter server XMLRPC port"
          type="number"
          isRequired
        />

        <FormElement
          name={"user"}
          label="User"
          description="The XMLRPC user."
          placeholder="Enter user"
          isRequired
        />

        <FormElement
          name={"password"}
          label="Password"
          description="The XMLRPC password."
          placeholder="Enter password"
          isRequired
        />

        {/* Users with roles */}
        <div className="flex flex-col gap-2">
          <FormLabel className="text-sm">Users</FormLabel>
          {userFields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <div className="flex-1">
                <FormElement
                  name={`userServers.${index}.userId`}
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
                name={`userServers.${index}.role`}
                className="w-24 sm:w-30"
                placeholder="Select role"
                options={Object.values(UserServerRole).map((role) => ({
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
            onClick={() => append({ userId: "", role: UserServerRole.Member })}
          >
            <IconPlus />
            Add User
          </Button>
        </div>

        <FormElement
          name={"filemanagerUrl"}
          label="Filemanager url"
          description="The url of the filemanager."
          placeholder="Enter filemanager url"
        />

        <FormElement
          name={"filemanagerPassword"}
          label="Filemanager password"
          description="The password for the filemanager."
          placeholder="Enter filemanager password"
        />

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={form.formState.isSubmitting}
        >
          <IconPlus />
          Add Server
        </Button>
      </form>
    </Form>
  );
}
