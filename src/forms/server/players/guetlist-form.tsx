"use client";

import { loadGuestlist, saveGuestlist } from "@/actions/gbx/player";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { guestlistSchema, GuestlistSchemaType } from "./guestlist-schema";

export default function GuestlistForm({ serverId }: { serverId: number }) {
  const form = useForm<GuestlistSchemaType>({
    resolver: zodResolver(guestlistSchema),
    defaultValues: {
      filename: "",
    },
  });

  async function onLoad() {
    try {
      form.trigger("filename");
      const filename = form.getValues("filename");
      const { error } = await loadGuestlist(serverId, filename);
      if (error) {
        throw new Error(error);
      }

      toast.success("Guestlist successfully loaded");
    } catch (error) {
      toast.error("Error loading guestlist", {
        description: getErrorMessage(error),
      });
    }
  }

  async function onSave() {
    try {
      form.trigger("filename");
      const filename = form.getValues("filename");
      const { error } = await saveGuestlist(serverId, filename);
      if (error) {
        throw new Error(error);
      }

      toast.success("Guestlist successfully saved");
    } catch (error) {
      toast.error("Error saving guestlist", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Form {...form}>
      <form className="flex flex-col gap-2">
        <FormElement
          control={form.control}
          name="filename"
          placeholder="guestlist.txt"
          error={form.formState.errors.filename}
          className="min-w-64"
          isRequired
        >
          <div className="gap-2 hidden max-[500px]:hidden max-[800px]:flex min-[890px]:flex">
            <Button className="w-20" type="button" onClick={onLoad}>
              Load
            </Button>
            <Button className="w-20" type="button" onClick={onSave}>
              Save
            </Button>
          </div>
        </FormElement>

        <div className="flex gap-2 max-[500px]:flex max-[800px]:hidden min-[890px]:hidden">
          <Button className="w-20" type="button" onClick={onLoad}>
            Load
          </Button>
          <Button className="w-20" type="button" onClick={onSave}>
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
}
