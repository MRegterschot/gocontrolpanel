"use client";

import {
  cleanGuestlist,
  loadGuestlist,
  saveGuestlist,
} from "@/actions/gbx/player";
import FormElement from "@/components/form/form-element";
import ConfirmModal from "@/components/modals/confirm-modal";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconDeviceFloppy,
  IconFileSettings,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { guestlistSchema, GuestlistSchemaType } from "./guestlist-schema";

export default function GuestlistForm({
  serverId,
  refetch,
}: {
  serverId: string;
  refetch: () => void;
}) {
  const [confirmClearGuestlist, setConfirmClearGuestlist] = useState(false);
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

  const handleClearGuestlist = async () => {
    try {
      const { error } = await cleanGuestlist(serverId);
      if (error) {
        throw new Error(error);
      }

      toast.success("Guestlist cleared");
      refetch();
    } catch (error) {
      toast.error("Error clearing guestlist", {
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <Form {...form}>
      <form className="flex flex-col sm:flex-row gap-2 w-full justify-between">
        <FormElement name="filename" placeholder="guestlist.txt" isRequired />

        <div className="flex gap-2 justify-between w-full">
          <div className="flex gap-2">
            <Button type="button" onClick={onLoad}>
              <IconFileSettings />
              Load
            </Button>
            <Button type="button" onClick={onSave}>
              <IconDeviceFloppy />
              Save
            </Button>
          </div>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmClearGuestlist(true)}
          >
            <IconTrash />
            Clear Guestlist
          </Button>
        </div>
      </form>

      <ConfirmModal
        title="Clear Guestlist"
        description="Are you sure you want to clear the guestlist?"
        isOpen={confirmClearGuestlist}
        onClose={() => setConfirmClearGuestlist(false)}
        onConfirm={handleClearGuestlist}
        confirmText="Clear"
        cancelText="Cancel"
      />
    </Form>
  );
}
