import { IconCheck, IconX, TablerIcon } from "@tabler/icons-react";
import React from "react";

interface BooleanDisplayProps {
  value: boolean;
  trueIcon?: TablerIcon;
  falseIcon?: TablerIcon;
  className?: string;
  size?: number;
}

export default function BooleanDisplay({
  value,
  trueIcon,
  falseIcon,
  className,
  size = 24,
}: BooleanDisplayProps) {
  const defaultTrueIcon = trueIcon || IconCheck;
  const defaultFalseIcon = falseIcon || IconX;

  return (
    <div className={className}>
      {value
        ? React.createElement(defaultTrueIcon, { size })
        : React.createElement(defaultFalseIcon, { size })}
    </div>
  );
}
