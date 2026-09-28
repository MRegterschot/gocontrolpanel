"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CompetitionV1 } from "@/lib/server-manager/types";
import { IconChevronDown, IconFileSymlink, IconSettings } from "@tabler/icons-react";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import Link from "next/link";
import { memo } from "react";

export type CompetitionV1NodeType = Node<CompetitionV1>;

function CompetitionV1Node(props: NodeProps<CompetitionV1NodeType>) {
  return (

    <Card>
      <div className=" bg-red-300 rounded-lg flex">
        <IconChevronDown className="h-[1em] items-center text-inherit leading-none self-center align-middle bg-none p-0 m-0 " />
        <p className="font-bold">
          {props.data.name}
        </p>
        <IconSettings className="pl-2 h-[1em] items-center text-inherit leading-none self-center align-middle bg-none p-0 m-0 " />
      </div>
      <Handle type="source" position={Position.Right} className="h-5! rounded-sm!" />
      <Handle type="target" position={Position.Left} className="h-5! rounded-sm!" />

      <div>

      </div>
    </Card>
  );
}

export default memo(CompetitionV1Node)