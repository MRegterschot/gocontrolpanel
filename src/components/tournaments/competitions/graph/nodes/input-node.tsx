"use client";

import { InputV1 } from "@/lib/server-manager/types";
import { IconLogin2 } from "@tabler/icons-react";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";
import NodeCard from "./node-card";

export type InputV1NodeType = Node<InputV1>;

function InputV1Node(props: NodeProps<InputV1NodeType>) {
  return (
    <NodeCard id={props.id} name={props.data.name} icon={IconLogin2} color="bg-purple-700">
      <Handle type="source" position={Position.Right} className="h-5! rounded-sm!" />
      <p className="text-muted-foreground">Players entering this stage</p>
    </NodeCard>
  );
}

export default memo(InputV1Node);
