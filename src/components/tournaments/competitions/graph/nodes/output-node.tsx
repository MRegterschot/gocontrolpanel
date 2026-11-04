"use client";

import { OutputV1 } from "@/lib/server-manager/types";
import { IconLogout2 } from "@tabler/icons-react";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";
import NodeCard from "./node-card";

export type OutputV1NodeType = Node<OutputV1>;

function OutputV1Node(props: NodeProps<OutputV1NodeType>) {
  return (
    <NodeCard id={props.id} name={props.data.name} icon={IconLogout2} color="bg-pink-700">
      <Handle type="target" position={Position.Left} className="h-5! rounded-sm!" />
      <p className="text-muted-foreground">Players leaving this stage</p>
    </NodeCard>
  );
}

export default memo(OutputV1Node);
