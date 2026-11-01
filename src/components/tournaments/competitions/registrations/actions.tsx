"use client";

import Modal from "@/components/modals/modal";
import OverrideRegistrationsModal from "@/components/modals/tournaments/competition/override-registrations";
import { Button } from "@/components/ui/button";
import { Registration, RegistrationStatus } from "@/lib/server-manager/types";
import { IconEdit } from "@tabler/icons-react";
import SelfRegistrationButton from "./self-registration-button";

export const createActions = (registration?: Registration) => {
  if (!registration) return null;

  return (
    <div className="flex gap-2 flex-row">
      {registration.status.tag === RegistrationStatus.Ongoing.tag && (
        <SelfRegistrationButton registrationId={registration.id} />
      )}

      <Modal closeOnBackdropClick={false}>
        <OverrideRegistrationsModal
          data={{ registrationId: registration?.id }}
        />
        <Button className="w-9 sm:w-auto" variant={"outline"}>
          <IconEdit />
          <span className="hidden sm:inline">Override Registrations</span>
        </Button>
      </Modal>
    </div>
  );
};
