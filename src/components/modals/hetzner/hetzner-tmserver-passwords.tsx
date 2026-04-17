import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HetznerServer } from "@/types/api/hetzner/servers";
import { IconX } from "@tabler/icons-react";
import { Card } from "../../ui/card";
import { DefaultModalProps } from "../default-props";

export default function HetznerTMServerPasswordsModal({
  closeModal,
  data,
}: DefaultModalProps<HetznerServer>) {
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
    }
  > = {};

  Object.keys(data.labels).forEach((key) => {
    // Every server entry has 4 labels, they are seperated per server by a number, so we can group them by that number
    const match = key.match(
      /^(\d+)\.(authorization|filemanager)\.(superadmin|admin|user|password)/,
    );
    if (match) {
      const serverNumber = match[1];
      const type = match[2];
      const role = match[3];

      if (!servers[serverNumber]) {
        servers[serverNumber] = {
          superadmin: undefined,
          admin: undefined,
          user: undefined,
          filemanager: undefined,
        };
      }

      if (type === "authorization") {
        servers[serverNumber][role as "superadmin" | "admin" | "user"] =
          data.labels[key];
      } else if (type === "filemanager") {
        servers[serverNumber].filemanager = data.labels[key];
      }
    }
  });

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-100 max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Server Passwords</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <Accordion type="multiple" className="w-full">
        {Object.keys(servers).map((serverNumber) => (
          <AccordionItem key={serverNumber} value={serverNumber}>
            <AccordionTrigger>TM Server {parseInt(serverNumber) + 1}</AccordionTrigger>
            <AccordionContent>
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
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
}
