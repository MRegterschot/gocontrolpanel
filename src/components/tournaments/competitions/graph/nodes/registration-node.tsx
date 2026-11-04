"use client";

import { Badge } from "@/components/ui/badge";
import { Registration } from "@/lib/server-manager/types";
import { IconClipboardList } from "@tabler/icons-react";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";
import NodeCard, { NodeRow } from "./node-card";

export type RegistrationV1NodeType = Node<Registration>;

function RegistrationV1Node(props: NodeProps<RegistrationV1NodeType>) {
  return (
    <NodeCard id={props.id} name={props.data.name} icon={IconClipboardList} color="bg-blue-700">
      <Handle type="source" position={Position.Right} className="h-5! rounded-sm!" />
      <NodeRow label="Status"><Badge variant="outline">{props.data.status.tag}</Badge></NodeRow>
      <NodeRow label="Registering">{props.data.settings.tag}s</NodeRow>
      <NodeRow label="Limit">{props.data.settings.value.playerLimit}</NodeRow>
    </NodeCard>
  );
}

export default memo(RegistrationV1Node);
