"use client";

import { CompetitionV1 } from "@/lib/server-manager/types";
import { IconExternalLink, IconTournament } from "@tabler/icons-react";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import Link from "next/link";
import { memo } from "react";
import NodeCard from "./node-card";

export type CompetitionV1NodeType = Node<CompetitionV1>;

function CompetitionV1Node(props: NodeProps<CompetitionV1NodeType>) {
  return (
    <NodeCard id={props.id} name={props.data.name} icon={IconTournament} color="bg-red-700">
      <Handle type="source" position={Position.Right} className="h-5! rounded-sm!" />
      <Handle type="target" position={Position.Left} className="h-5! rounded-sm!" />
      <Link href={`/competitions/${props.data.id}`} className="nodrag flex items-center gap-1 text-muted-foreground hover:text-foreground">
        <IconExternalLink className="size-3.5" />
        Open stage
      </Link>
    </NodeCard>
  );
}

export default memo(CompetitionV1Node);
