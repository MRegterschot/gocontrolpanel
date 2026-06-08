import {
  restartTrackmaniaServer,
  stopTrackmaniaServer,
} from "@/actions/hetzner/server-actions";
import { deleteTrackmaniaServer } from "@/actions/hetzner/server-setup";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HetznerServer } from "@/types/api/hetzner/servers";
import { IconRefresh, IconTrash, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "../../ui/card";
import { DefaultModalProps } from "../default-props";

export default function HetznerTMServersModal({
  closeModal,
  data,
}: DefaultModalProps<{
  projectId: string;
  server: HetznerServer;
}>) {
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isRestarting, setIsRestarting] = useState<number | null>(null);
  const [isStopping, setIsStopping] = useState<number | null>(null);

  if (!data) return null;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const servers: Record<
    string,
    {
      superadmin: string | undefined;
      admin: string | undefined;
      user: string | undefined;
      filemanager: string | undefined;
      version: number;
    }
  > = {};

  Object.keys(data.server.labels).forEach((key) => {
    const parts = key.split(".");
    const serverNumber = parts[0];

    if (!serverNumber || isNaN(Number(serverNumber))) {
      return;
    }

    if (!servers[serverNumber]) {
      servers[serverNumber] = {
        superadmin: undefined,
        admin: undefined,
        user: undefined,
        filemanager: undefined,
        version: 0,
      };
    }

    const value = data.server.labels[key];

    if (parts[1] === "version") {
      servers[serverNumber].version = parseInt(value || "0", 10);
    } else if (parts[1] === "authorization" && parts[3] === "password") {
      if (
        parts[2] === "superadmin" ||
        parts[2] === "admin" ||
        parts[2] === "user"
      ) {
        servers[serverNumber][parts[2]] = value;
      }
    } else if (parts[1] === "filemanager" && parts[2] === "password") {
      servers[serverNumber].filemanager = value;
    }
  });

  console.log(servers);

  const onDeleteServer = async (serverNumber: number) => {
    try {
      setIsDeleting(serverNumber);
      const { error } = await deleteTrackmaniaServer(
        data.projectId,
        data.server.id,
        serverNumber,
      );
      if (error) {
        throw new Error(error);
      }
      toast.success(`Deleted TM server ${serverNumber + 1} successfully`);
      closeModal?.();
    } catch {
      toast.error(`Failed to delete TM server ${serverNumber + 1}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const onRestartServer = async (serverNumber: number) => {
    try {
      setIsRestarting(serverNumber);
      const { error } = await restartTrackmaniaServer(
        data.projectId,
        data.server.id,
        serverNumber,
      );
      if (error) {
        throw new Error(error);
      }
      toast.success(`Restarted server ${serverNumber + 1} successfully`);
    } catch {
      toast.error(`Failed to restart server ${serverNumber + 1}`);
    } finally {
      setIsRestarting(null);
    }
  };

  const onStopServer = async (serverNumber: number) => {
    try {
      setIsStopping(serverNumber);
      const { error } = await stopTrackmaniaServer(
        data.projectId,
        data.server.id,
        serverNumber,
      );
      if (error) {
        throw new Error(error);
      }
      toast.success(`Stopped server ${serverNumber + 1} successfully`);
    } catch {
      toast.error(`Failed to stop server ${serverNumber + 1}`);
    } finally {
      setIsStopping(null);
    }
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-100 max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Trackmania Servers</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <Accordion type="multiple" className="w-full">
        {Object.keys(servers).map((serverNumber) => (
          <AccordionItem key={serverNumber} value={serverNumber}>
            <AccordionTrigger>
              TM Server {parseInt(serverNumber) + 1}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                <h4 className="text-muted-foreground">Passwords</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <span className="font-semibold">SuperAdmin</span>
                    <span className="truncate">
                      {servers[serverNumber].superadmin || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">Admin</span>
                    <span className="truncate">
                      {servers[serverNumber].admin || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">User</span>
                    <span className="truncate">
                      {servers[serverNumber].user || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">File Manager</span>
                    <span className="truncate">
                      {servers[serverNumber].filemanager || "-"}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button
                  variant={"destructive"}
                  onClick={() => onDeleteServer(parseInt(serverNumber))}
                  disabled={
                    isDeleting !== null && isDeleting === parseInt(serverNumber)
                  }
                >
                  <IconTrash />
                  Delete
                </Button>

                {servers[serverNumber].version >= 1 && (
                  <>
                    <Button
                      variant={"outline"}
                      onClick={() => onRestartServer(parseInt(serverNumber))}
                      disabled={
                        isRestarting !== null &&
                        isRestarting === parseInt(serverNumber)
                      }
                    >
                      <IconRefresh />
                      Restart
                    </Button>

                    <Button
                      variant={"outline"}
                      onClick={() => onStopServer(parseInt(serverNumber))}
                      disabled={
                        isStopping !== null &&
                        isStopping === parseInt(serverNumber)
                      }
                    >
                      <IconX />
                      Stop
                    </Button>
                  </>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
}
