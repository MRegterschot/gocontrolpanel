import { formatTime } from "@/lib/utils";

interface TimeDisplayProps {
  time: number;
  className?: string;
}

export default function TimeDisplay({ time, className }: TimeDisplayProps) {
  return <div className={className}>{formatTime(time)}</div>;
}
