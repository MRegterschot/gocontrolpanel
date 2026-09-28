"use client";

import { Card } from "@/components/ui/card";
import { Registration } from "@/lib/server-manager/types";
import { IconChevronDown, IconSettings } from "@tabler/icons-react";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

export type RegistrationV1NodeType = Node<Registration>;

function RegistrationV1Node(props: NodeProps<RegistrationV1NodeType>) {
  return (

    <Card>
      <div className=" bg-blue-300 rounded-t-lg flex">
        <IconChevronDown className="h-[1em] items-center text-inherit leading-none self-center align-middle bg-none p-0 m-0 " />
        <p className="font-bold">
          {props.data.name}
        </p>
        <IconSettings className="pl-2 h-[1em] items-center text-inherit leading-none self-center align-middle bg-none p-0 m-0 " />
      </div>
      <Handle type="source" position={Position.Right} className="h-5! rounded-sm!" />
      {/* <Handle type="target" position={Position.Left} /> */}

      <div className="px-2 flex flex-col gap-2">
        <div > Status: {props.data.status.tag}</div>
        <div>Registering: {props.data.settings.tag}s Max: {props.data.settings.value.playerLimit} </div>
      </div>
    </Card>
  );
}

export default memo(RegistrationV1Node)