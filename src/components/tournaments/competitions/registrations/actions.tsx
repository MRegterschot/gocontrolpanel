"use client";

import Modal from "@/components/modals/modal";
import OverrideRegistrationsModal from "@/components/modals/tournaments/competition/override-registrations";
import RegisterPlayerModal from "@/components/modals/tournaments/competition/register-player";
import { Button } from "@/components/ui/button";
import { Registration, RegistrationStatus } from "@/lib/server-manager/types";
import { IconEdit, IconUserPlus } from "@tabler/icons-react";

export const createActions = (registration?: Registration) => {
  if (!registration) return null;

  return (
    <div className="flex gap-2 flex-row">
      {registration.status.tag === RegistrationStatus.Ongoing.tag && (
        <Modal closeOnBackdropClick={false}>
          <RegisterPlayerModal data={{ registrationId: registration?.id }} />
          <Button className="w-9 sm:w-auto" variant={"outline"}>
            <IconUserPlus />
            <span className="hidden sm:inline">Register Player</span>
          </Button>
        </Modal>
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
