import { PaginationState } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "../ui/button";

interface GridPaginationProps {
  pagination: PaginationState;
  setPagination: (updater: (prev: PaginationState) => PaginationState) => void;
  pageCount: number;
}

export default function GridPagination({
  pagination,
  setPagination,
  pageCount,
}: GridPaginationProps) {
  return (
    <div className="flex items-center justify-end">
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {pagination.pageIndex + 1} of {pageCount}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 sm:flex"
            onClick={() => setPagination((prev) => ({ ...prev, pageIndex: 0 }))}
            disabled={pagination.pageIndex === 0}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                pageIndex: Math.max(0, prev.pageIndex - 1),
              }))
            }
            disabled={pagination.pageIndex === 0}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                pageIndex: Math.min(pageCount - 1, prev.pageIndex + 1),
              }))
            }
            disabled={pagination.pageIndex === pageCount - 1}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 sm:flex"
            onClick={() =>
              setPagination((prev) => ({ ...prev, pageIndex: pageCount - 1 }))
            }
            disabled={pagination.pageIndex === pageCount - 1}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
