import { Skeleton } from "../ui/skeleton";

export default function FormElementSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="w-2/3 min-w-64 h-2" />
      <Skeleton className="w-full min-w-64 h-2" />

      <Skeleton className="w-1/3 min-w-64 h-8 mt-2" />
    </div>
  );
}
