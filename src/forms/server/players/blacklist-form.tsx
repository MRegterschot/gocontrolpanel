"use client";

import {
  cleanBlacklist,
  loadBlacklist,
  saveBlacklist,
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
import { blacklistSchema, BlacklistSchemaType } from "./blacklist-schema";

export default function BlacklistForm({
  serverId,
  refetch,
}: {
  serverId: string;
  refetch: () => void;
}) {
  const [confirmClearBlacklist, setConfirmClearBlacklist] = useState(false);

  const form = useForm<BlacklistSchemaType>({
    resolver: zodResolver(blacklistSchema),
    defaultValues: {
      filename: "",
    },
  });

  async function onLoad() {
    try {
      form.trigger("filename");
      const filename = form.getValues("filename");
      const { error } = await loadBlacklist(serverId, filename);
      if (error) {
        throw new Error(error);
      }

      toast.success("Blacklist successfully loaded");
    } catch (error) {
      toast.error("Error loading blacklist", {
        description: getErrorMessage(error),
      });
    }
  }

  async function onSave() {
    try {
      form.trigger("filename");
      const filename = form.getValues("filename");
      const { error } = await saveBlacklist(serverId, filename);
      if (error) {
        throw new Error(error);
      }

      toast.success("Blacklist successfully saved");
    } catch (error) {
      toast.error("Error saving blacklist", {
        description: getErrorMessage(error),
      });
    }
  }

  const handleClearBlacklist = async () => {
    try {
      const { error } = await cleanBlacklist(serverId);
      if (error) {
        throw new Error(error);
      }

      toast.success("Blacklist cleared");
      refetch();
    } catch (error) {
      toast.error("Error clearing blacklist", {
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <Form {...form}>
      <form className="flex flex-col sm:flex-row gap-2 w-full justify-between">
        <FormElement name="filename" placeholder="blacklist.txt" isRequired />

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
            onClick={() => setConfirmClearBlacklist(true)}
          >
            <IconTrash />
            Clear Blacklist
          </Button>
        </div>
      </form>

      <ConfirmModal
        title="Clear Blacklist"
        description="Are you sure you want to clear the blacklist?"
        isOpen={confirmClearBlacklist}
        onClose={() => setConfirmClearBlacklist(false)}
        onConfirm={handleClearBlacklist}
        confirmText="Clear"
        cancelText="Cancel"
      />
    </Form>
  );
}
