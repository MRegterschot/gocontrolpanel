"use client";

import { setTeamMatchPoints } from "@/actions/gbx/player";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { Team } from "@/types/live";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  SetTeamPointsSchema,
  SetTeamPointsSchemaType,
} from "./set-team-points-schema";
import { ServerError } from "@/types/responses";

export default function SetTeamMatchPointsForm({
  serverId,
  teams,
  callback,
}: {
  serverId: string;
  teams: Record<number, Team>;
  callback?: () => void;
}) {
  const form = useForm<SetTeamPointsSchemaType>({
    resolver: zodResolver(SetTeamPointsSchema),
    defaultValues: {
      serverId,
      team: "0",
      points: teams[0]?.matchPoints,
    },
  });

  async function onSubmit(values: SetTeamPointsSchemaType) {
    try {
      const { error } = await setTeamMatchPoints(
        values.serverId,
        Number(values.team),
        values.points,
      );
      if (error) {
        throw new ServerError(error, "SetTeamMatchPointsError");
      }

      toast.success("Points successfully updated");
      callback?.();
    } catch (error) {
      toast.error("Error updating points", {
        description: getErrorMessage(error),
      });
    }
  }

  // Set the default points value based on the selected team
  const selectedTeam = form.watch("team");
  const defaultPoints = teams[Number(selectedTeam)]?.matchPoints || 0;

  useEffect(() => {
    form.setValue("points", defaultPoints);
  }, [selectedTeam, defaultPoints, form]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <FormElement
          name={"team"}
          label={"Team"}
          className="max-w-32"
          type="select"
          options={[
            { value: "0", label: teams[0]?.name || "Blue" },
            { value: "1", label: teams[1]?.name || "Red" },
          ]}
          isRequired
        />

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
