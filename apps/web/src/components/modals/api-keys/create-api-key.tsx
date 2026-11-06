"use client";

import { ModalContent } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { Copy } from "@/components/ui/copy";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CreateApiKeyForm from "@/forms/api-keys/create-api-key-form";
import type { ApiKeyTarget } from "@/lib/api-keys/authenticate";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useState } from "react";
import { DefaultModalProps } from "../default-props";

export default function CreateApiKeyModal({
  closeModal,
  onSubmit,
  data: target,
}: DefaultModalProps<ApiKeyTarget>) {
  // Shown once: the panel only keeps the token's hash
  const [token, setToken] = useState<string | null>(null);

  if (!target) return null;

  return (
    <ModalContent className="sm:max-w-xl">
      <DialogHeader className="pr-6">
        <DialogTitle>
          {token ? "Copy your API key" : "Create API key"}
        </DialogTitle>
      </DialogHeader>
      {token ? (
        <div className="flex flex-col gap-4">
          <p className="flex gap-2 text-sm text-muted-foreground">
            <IconAlertTriangle className="size-5 shrink-0 text-amber-500" />
            This is the only time the key is shown. Store it somewhere safe; if
            it is lost, revoke it and create a new one.
          </p>
          <Copy
            text={token}
            copyMessage="API key copied"
            className="max-w-full font-mono text-xs"
            aria-label="Copy API key"
          />
          <Button onClick={() => closeModal?.()}>Done</Button>
        </div>
      ) : (
        <CreateApiKeyForm
          target={target}
          callback={(created) => {
            setToken(created);
            onSubmit?.();
          }}
        />
      )}
    </ModalContent>
  );
}
