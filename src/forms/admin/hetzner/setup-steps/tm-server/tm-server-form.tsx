"use client";
import { addTrackmaniaServer } from "@/actions/hetzner/server-setup";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { TMServerSchema, TMServerSchemaType } from "./tm-server-schema";

export default function TMServerForm({
  projectId,
  serverId,
  callback,
}: {
  projectId: string;
  serverId: number;
  callback?: () => void;
}) {
  const { data: session } = useSession();

  const groups = useMemo(() => {
    if (!session?.user) return [];
    return session.user.groups.map((group) => ({
      label: group.name,
      value: group.id,
    }));
  }, [session?.user]);

  const form = useForm<TMServerSchemaType>({
    resolver: zodResolver(TMServerSchema),
    defaultValues: {
      createServer: true,
      groupId: "",
    },
  });

  async function onSubmit(values: TMServerSchemaType) {
    try {
      const { error } = await addTrackmaniaServer(projectId, serverId, values);
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

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormElement
          name={"dediLogin"}
          label="Trackmania Server Login"
          placeholder="Enter server login"
          isRequired
        />

        <FormElement
          name={"dediPassword"}
          label="Trackmania Server Password"
          placeholder="Enter server password"
          type="password"
          isRequired
        />

        <FormElement
          name={"roomPassword"}
          label="Room Password"
          placeholder="Enter room password"
        />

        <FormElement
          label="Automatically create server"
          name="createServer"
          type="checkbox"
        />

        <FormElement
          label="Group"
          name="groupId"
          type="select"
          options={groups}
          placeholder="Select a group"
          className="w-48"
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
