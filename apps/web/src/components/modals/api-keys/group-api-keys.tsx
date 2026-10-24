"use client";

import { GroupApiKeys } from "@/components/api-keys/api-keys-panel";
import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { routes } from "@/routes";
import { DefaultModalProps } from "../default-props";

export default function GroupApiKeysModal({
  data: group,
}: DefaultModalProps<{ id: string; name: string }>) {
  if (!group) return null;

  return (
    <ModalContent className="sm:max-w-5xl">
      <DialogHeader className="pr-6">
        <DialogTitle>API keys of {group.name}</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        A group key reaches every server currently in the group. It stops
        working when its creator is no longer an admin of the group. See the{" "}
        <a href={routes.apiDocs} className="underline">
          API reference
        </a>
        .
      </p>
      <GroupApiKeys groupId={group.id} />
    </ModalContent>
  );
}
