import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AuditLogsWithUsers } from "@/services/database/audit-logs";
import { DefaultModalProps } from "../default-props";

export default function AuditLogDetailsModal({
  data,
}: DefaultModalProps<AuditLogsWithUsers>) {
  if (!data) return null;

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Log Details</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h4 className="text-muted-foreground">General</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <span className="font-semibold">Action</span>
              <span className="truncate">{data.action}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">User</span>
              <span className="truncate">{data.user?.nickName ?? "-"}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Target</span>
              <span className="truncate">{data.targetId}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Timestamp</span>
              <span className="truncate">
                {new Date(data.createdAt).toLocaleDateString()}{" "}
                {new Date(data.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {data.details && (
          <div className="flex flex-col gap-2">
            <h4 className="text-muted-foreground">Details</h4>
            <pre className="whitespace-pre-wrap wrap-break-word">
              {JSON.stringify(data.details, null, 2)}
            </pre>
          </div>
        )}

        {data.error && (
          <div className="flex flex-col gap-2">
            <h4 className="text-muted-foreground">Error</h4>
            <span className="truncate">{data.error}</span>
          </div>
        )}
      </div>
    </ModalContent>
  );
}
