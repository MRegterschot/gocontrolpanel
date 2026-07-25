"use client";

import { setShowOpponents } from "@/actions/gbx/game";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy, IconEye, IconRotate } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ShowOpponentsSchema, ShowOpponentsSchemaType } from "./game-schema";

export default function ShowOpponentsForm({
  serverId,
  showOpponents,
}: {
  serverId: string;
  showOpponents: number;
}) {
  const showOpponentsForm = useForm<ShowOpponentsSchemaType>({
    resolver: zodResolver(ShowOpponentsSchema),
    defaultValues: {
      showOpponents,
    },
  });

  async function onSubmitShowOpponents(values: ShowOpponentsSchemaType) {
    try {
      const { error } = await setShowOpponents(serverId, values.showOpponents);
      if (error) {
        throw new Error(error);
      }
      toast.success("Show Opponents successfully updated");
    } catch (error) {
      toast.error("Failed to update Show Opponents", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Form {...showOpponentsForm}>
      <form
        onSubmit={showOpponentsForm.handleSubmit(onSubmitShowOpponents)}
        className="flex flex-col gap-2"
      >
        <FormElement
          name={"showOpponents"}
          label="Show Opponents"
          description="The number of opponents to show. 0 is no override, 1 is show all, rest is the number of opponents."
          placeholder="Show Opponents..."
          rootClassName="max-w-full"
          className="w-20"
          isRequired
          type="number"
        >
          <div className="flex gap-2">
            <Button
              variant={"outline"}
              type="button"
              collapse="sm"
              onClick={() => showOpponentsForm.setValue("showOpponents", 0)}
            >
              <IconRotate className="rotate-180" />
              Reset
            </Button>
            <Button
              variant={"outline"}
              type="button"
              collapse="sm"
              onClick={() => showOpponentsForm.setValue("showOpponents", 1)}
            >
              <IconEye />
              Show All
            </Button>
            <Button
              type="submit"
              disabled={showOpponentsForm.formState.isSubmitting}
            >
              <IconDeviceFloppy />
              Save
            </Button>
          </div>
        </FormElement>
      </form>
    </Form>
  );
}
