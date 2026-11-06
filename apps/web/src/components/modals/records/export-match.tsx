import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ExportMatchForm from "@/forms/server/records/export-match-form";
import type { MatchesWithMapAndRecords } from "@/services/database/matches";
import { DefaultModalProps } from "../default-props";

export default function ExportMatchModal({
  closeModal,
  serverId,
  data,
}: DefaultModalProps<MatchesWithMapAndRecords>) {
  if (!data || !serverId) return null;

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Export Match</DialogTitle>
      </DialogHeader>

      <ExportMatchForm match={data} callback={closeModal} />
    </ModalContent>
  );
}
