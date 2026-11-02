"use client";

import MatchStatusBadge from "@/components/tournaments/match/match-status-badge";
import { MatchV1 } from "@/lib/server-manager/types";
import { IconSwords } from "@tabler/icons-react";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";
import NodeCard, { NodeFlag, NodeRow } from "./node-card";

export type MatchV1NodeType = Node<MatchV1>;

function MatchV1Node(props: NodeProps<MatchV1NodeType>) {
  return (
    <NodeCard id={props.id} name={props.data.name} icon={IconSwords} color="bg-green-700">
      <Handle type="source" position={Position.Right} className="h-5! rounded-sm!" />
      <Handle type="target" position={Position.Left} className="h-5! rounded-sm!" />
      <NodeRow label="Status"><MatchStatusBadge status={props.data.status} /></NodeRow>
      <NodeRow label="Auto provision"><NodeFlag value={props.data.autoProvisionServer} /></NodeRow>
      <NodeRow label="Open"><NodeFlag value={props.data.open} /></NodeRow>
    </NodeCard>
  );
}

export default memo(MatchV1Node);
