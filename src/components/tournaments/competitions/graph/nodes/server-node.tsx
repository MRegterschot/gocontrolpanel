"use client";

import { Badge } from "@/components/ui/badge";
import { ServerV1 } from "@/lib/server-manager/types";
import { IconServer } from "@tabler/icons-react";
import { Node, NodeProps } from "@xyflow/react";
import { memo } from "react";
import NodeCard, { NodeFlag, NodeRow } from "./node-card";

export type ServerV1NodeType = Node<ServerV1>;

// Servers cannot be connected yet, the server module does not handle them in connections.
function ServerV1Node(props: NodeProps<ServerV1NodeType>) {
  return (
    <NodeCard id={props.id} name={props.data.name} icon={IconServer} color="bg-orange-700">
      <NodeRow label="Status"><Badge variant="outline">{props.data.status.tag}</Badge></NodeRow>
      <NodeRow label="Auto provision"><NodeFlag value={props.data.autoProvision} /></NodeRow>
      <NodeRow label="Open"><NodeFlag value={props.data.open} /></NodeRow>
    </NodeCard>
  );
}

export default memo(ServerV1Node);
