"use client";

import { setPlayerMatchPoints } from "@/actions/gbx/player";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  SetPlayerPointsSchema,
  SetPlayerPointsSchemaType,
} from "./set-player-points-schema";

export default function SetPlayerMatchPointsForm({
  serverId,
  login,
  points,
  callback,
}: {
  serverId: string;
  login: string;
  points: number;
  callback?: () => void;
}) {
  const form = useForm<SetPlayerPointsSchemaType>({
    resolver: zodResolver(SetPlayerPointsSchema),
    defaultValues: {
      serverId,
      login,
      points,
    },
  });

  async function onSubmit(values: SetPlayerPointsSchemaType) {
    try {
      const { error } = await setPlayerMatchPoints(
        values.serverId,
        values.login,
        values.points,
      );
      if (error) {
        throw new Error(error);
      }

      toast.success("Points successfully updated");
      callback?.();
    } catch (error) {
      toast.error("Error updating points", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <FormElement
          name={"points"}
          label={"Points"}
          className="max-w-32"
          type="number"
          step={1}
          isRequired
        />

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={form.formState.isSubmitting}
        >
          <IconDeviceFloppy />
          Set Points
        </Button>
      </form>
    </Form>
  );
}
