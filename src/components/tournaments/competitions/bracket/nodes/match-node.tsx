"use client";

import { Card } from "@/components/ui/card";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";

export type MatchNodeType = Node<{ label: string }>;

export default function MatchNode(props: NodeProps<MatchNodeType>) {
  return (
    <Card>
      <div style={{ padding: 10 }}>
        <strong>{props.data.label}</strong>
      </div>
      <Handle type="source" position={Position.Left} />
      <Handle type="target" position={Position.Right} />
    </Card>
  );
}
