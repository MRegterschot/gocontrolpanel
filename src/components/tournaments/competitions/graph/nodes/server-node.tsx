"use client";

import { Card } from "@/components/ui/card";
import { ServerV1 } from "@/lib/server-manager/types";
import { IconChevronDown } from "@tabler/icons-react";
import { Node, NodeProps } from "@xyflow/react";
import NodeSettingsButton from "./node-settings-button";
import { memo } from "react";

export type ServerV1NodeType = Node<ServerV1>;

// Servers cannot be connected yet, the server module does not handle them in connections.
function ServerV1Node(props: NodeProps<ServerV1NodeType>) {
  return (
    <Card>
      <div className=" bg-orange-300 rounded-t-lg flex">
        <IconChevronDown className="h-[1em] items-center text-inherit leading-none self-center align-middle bg-none p-0 m-0 " />
        <p className="font-bold">
          {props.data.name}
        </p>
        <NodeSettingsButton id={props.id} />
      </div>

      <div className="px-2 flex flex-col gap-2">
        <div>Status: {props.data.status.tag}</div>
      </div>
    </Card>
  );
}

export default memo(ServerV1Node)
