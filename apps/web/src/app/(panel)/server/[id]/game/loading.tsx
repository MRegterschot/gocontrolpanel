import FormElementSkeleton from "@/components/skeletons/form-element";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="max-w-[200px] h-4" />
        <Skeleton className="max-w-[600px] h-2" />
      </div>

      <div className="flex gap-4">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex px-12 gap-4 md:max-w-[calc(100vw-340px)]">
          <div className="flex flex-1 overflow-hidden gap-4">
            <Skeleton className="h-48 flex-1 min-w-0 shrink-0 basis-full min-[1060px]:basis-1/2 min-[1380px]:basis-1/3 m-auto" />
            <Skeleton className="h-48 flex-1 min-w-0 shrink-0 basis-full min-[1060px]:basis-1/2 min-[1380px]:basis-1/3 m-auto" />
            <Skeleton className="h-48 flex-1 min-w-0 shrink-0 basis-full min-[1060px]:basis-1/2 min-[1380px]:basis-1/3 m-auto" />
          </div>
        </div>

        <div className="flex justify-center gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      <Card className="p-6">
        <div className="flex gap-6 flex-col min-[960px]:flex-row">
          <div className="flex flex-col gap-4 flex-1">
            <FormElementSkeleton />
            <FormElementSkeleton />
          </div>
          <div className="flex flex-col gap-4 flex-1">
            <FormElementSkeleton />
            <FormElementSkeleton />
          </div>
        </div>
      </Card>
    </div>
  );
}
