import { MatchesWithMapAndRecords } from "@/actions/database/matches";
import ExportMatchForm from "@/forms/server/records/export-match-form";
import { IconX } from "@tabler/icons-react";
import { Card } from "../../ui/card";
import { DefaultModalProps } from "../default-props";

export default function ExportMatchModal({
  closeModal,
  serverId,
  data,
}: DefaultModalProps<MatchesWithMapAndRecords>) {
  if (!data || !serverId) return null;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Export Match</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <ExportMatchForm serverId={serverId} match={data} callback={closeModal} />
    </Card>
  );
}
