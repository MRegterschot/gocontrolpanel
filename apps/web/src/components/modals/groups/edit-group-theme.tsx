"use client";

import { updateGroupTheme } from "@/actions/database/themes";
import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ThemeForm from "@/forms/theme/theme-form";
import type { GroupsWithUsersWithServers } from "@/services/database/groups";
import { DEFAULT_THEME, parseTheme } from "@gcp/shared";
import { DefaultModalProps } from "../default-props";

export default function EditGroupThemeModal({
  closeModal,
  onSubmit,
  data,
}: DefaultModalProps<GroupsWithUsersWithServers>) {
  if (!data) return null;

  return (
    <ModalContent className="sm:max-w-3xl">
      <DialogHeader className="pr-6">
        <DialogTitle>Theme of {data.name}</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        The group&apos;s servers use this theme unless they have their own.
      </p>
      <ThemeForm
        theme={parseTheme(data.theme)}
        inherited={DEFAULT_THEME}
        inheritedLabel="the default theme"
        onSave={(theme) => updateGroupTheme(data.id, theme)}
        callback={() => {
          onSubmit?.();
          closeModal?.();
        }}
      />
    </ModalContent>
  );
}
