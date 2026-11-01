"use client";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { procedures } from "@/lib/server-manager";
import { NodeHandle } from "@/lib/server-manager/types";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useProcedure } from "spacetimedb/react";
import {
  CreateConnectionSchema,
  CreateConnectionSchemaType,
} from "./create-connection-schema";

const CONNECTION_OPTIONS =
  CreateConnectionSchema.shape.kind.shape.tag.options.map((o) => ({
    label: o,
    value: o,
  }));

export default function CreateConnectionForm({
  origin,
  target,
  callback,
}: {
  origin: NodeHandle;
  target: NodeHandle;
  callback?: () => void;
}) {
  const createConnection = useProcedure(procedures.connectionCreate);

  const form = useForm<CreateConnectionSchemaType>({
    resolver: zodResolver(CreateConnectionSchema),
    defaultValues: { kind: { tag: "Wait" } },
  });

  async function onSubmit({ kind }: CreateConnectionSchemaType) {
    try {
      const result = await createConnection({ origin, target, kind });
      if ("err" in result) throw new Error(result.err.tag);
      toast.success("Connection successfully created");
      callback?.();
    } catch (error) {
      toast.error("Failed to create connection", {
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
          label="Connection Type"
          name="kind.tag"
          type="select"
          className="w-full max-w-32"
          options={CONNECTION_OPTIONS}
          isRequired
        />

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={form.formState.isSubmitting}
        >
          <IconPlus />
          Create Connection
        </Button>
      </form>
    </Form>
  );
}
