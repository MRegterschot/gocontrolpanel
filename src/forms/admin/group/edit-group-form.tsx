"use client";
import {
  GroupsWithUsersWithServers,
  updateGroup,
} from "@/actions/database/groups";
import { getServersMinimal, ServerMinimal } from "@/actions/database/servers";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form, FormLabel } from "@/components/ui/form";
import { useSearchUsers } from "@/hooks/use-search-users";
import { GroupRole } from "@/lib/prisma/generated";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy, IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { EditGroupSchema, EditGroupSchemaType } from "./edit-group-schema";

export default function EditGroupForm({
  group,
  callback,
}: {
  group: GroupsWithUsersWithServers;
  callback?: () => void;
}) {
  const [servers, setServers] = useState<ServerMinimal[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    search,
    searchResults,
    searching,
    loading: searchLoading,
  } = useSearchUsers({
    defaultUsers: group.groupMembers.map((user) => user.userId),
  });

  useEffect(() => {
    async function fetch() {
      try {
        const { data, error } = await getServersMinimal();
        if (error) {
          throw new Error(error);
        }
        setServers(data);
      } catch (error) {
        setError("Failed to get servers: " + getErrorMessage(error));
        toast.error("Failed to fetch servers", {
          description: getErrorMessage(error),
        });
      }

      setLoading(false);
    }

    fetch();
  }, []);

  const form = useForm<EditGroupSchemaType>({
    resolver: zodResolver(EditGroupSchema),
    defaultValues: {
      ...group,
      groupServers: group.groupServers.map((server) => server.serverId),
      groupMembers: group.groupMembers.map((user) => ({
        userId: user.userId,
        role: user.role,
      })),
    },
  });

  const { control } = form;
  const {
    fields: memberFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "groupMembers",
  });

  async function onSubmit(values: EditGroupSchemaType) {
    try {
      const { error } = await updateGroup(group.id, {
        ...values,
        groupServers:
          values.groupServers?.map((id) => ({
            serverId: id,
          })) || [],
        groupMembers: values.groupMembers?.map((user) => ({
          userId: user.userId,
          role: user.role as GroupRole,
        })),
      });
      if (error) {
        throw new Error(error);
      }
      toast.success("Group successfully updated");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to update group", {
        description: getErrorMessage(error),
      });
    }
  }

  if (loading || searchLoading) {
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
          label="Group Name"
          placeholder="Enter group name"
          isRequired
        />

        <FormElement
          name="description"
          label="Description"
          placeholder="Enter group description"
        />

        <FormElement
          name="public"
          label="Public Group"
          type="checkbox"
          description="Makes group visible to all users"
        />

        <FormElement
          name="shareRecords"
          label="Share Records"
          type="checkbox"
          description="Share local records across servers in this group"
        />

        <FormElement
          name="groupServers"
          label="Servers"
          placeholder="Select servers"
          options={servers.map((server) => ({
            label: server.name,
            value: server.id,
          }))}
          type="multi-select"
        />

        {/* Users with roles */}
        <div className="flex flex-col gap-2">
          <FormLabel className="text-sm">Members</FormLabel>
          {memberFields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <div className="flex-1">
                <FormElement
                  name={`groupMembers.${index}.userId`}
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
                name={`groupMembers.${index}.role`}
                className="w-24 sm:w-30"
                placeholder="Select role"
                options={Object.values(GroupRole).map((role) => ({
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
                <span className="sr-only">Remove Member</span>
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => append({ userId: "", role: GroupRole.Member })}
          >
            <IconPlus />
            Add Member
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
