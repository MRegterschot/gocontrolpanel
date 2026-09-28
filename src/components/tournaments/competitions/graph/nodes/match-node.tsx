"use client";

import MatchStatusBadge from "@/components/tournaments/match/match-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MatchV1 } from "@/lib/server-manager/types";
import { IconChevronDown, IconExternalLink, IconFileSymlink, IconSettings } from "@tabler/icons-react";
import { Handle, Node, NodeProps, NodeToolbar, Position } from "@xyflow/react";
import Link from "next/link";
import { memo } from "react";

export type MatchV1NodeType = Node<MatchV1>;

function MatchV1Node(props: NodeProps<MatchV1NodeType>) {
  return (

    <Card className="">
      <div className=" bg-green-300 rounded-t-lg flex">
        <IconChevronDown className="h-[1em] items-center text-inherit leading-none self-center align-middle bg-none p-0 m-0 " />
        <p className="font-bold">
          {props.data.name}
        </p>
        <IconSettings className="pl-2 h-[1em] items-center text-inherit leading-none self-center align-middle bg-none p-0 m-0 " />
      </div>
      <Handle type="source" position={Position.Right} className="h-5! rounded-sm!" />
      <Handle type="target" position={Position.Left} className="h-5! rounded-sm!" />

      <div className="m-2 flex flex-col">
        <div className="flex">Status: <MatchStatusBadge status={props.data.status} /></div>
        <div className="flex">AutoProvision: <Checkbox checked={props.data.autoProvisionServer} /></div>
        <div className="flex">Open: <Checkbox checked={props.data.open} /></div>
        <div className="flex"><p>PreConfig</p><p>Config</p></div>
      </div>
    </Card>
  );
}

export default memo(MatchV1Node)
