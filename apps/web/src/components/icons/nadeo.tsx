import { cn } from "@/lib/utils";

type IconNadeoProps = {
  size?: number;
  className?: string;
};

export default function IconNadeo({
  size = 24,
  className = "",
}: IconNadeoProps) {
  return (
    <span
      className={cn(
        "flex items-center justify-center text-center font-semibold",
        className,
      )}
      style={{
        width: size / 1.5,
        height: size / 1.5,
      }}
    >
      N
    </span>
  );
}
