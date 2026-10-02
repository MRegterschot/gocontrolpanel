import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { routes } from "@/routes";
import Link from "next/link";
import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";

export interface TBreadcrumb {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  crumbs: TBreadcrumb[];
  className?: string;
}

export default function Breadcrumbs({ crumbs, className }: BreadcrumbsProps) {
  const isMobile = useIsMobile();
  const maxVisibleItems = isMobile ? 2 : 4; // Home + ... + Last

  const totalLength = crumbs.length + 1; // +1 for Home
  const hasOverflow = totalLength > maxVisibleItems;

  const middleVisible = maxVisibleItems - 2; // subtract Home + Last
  const middleCrumbs = hasOverflow
    ? crumbs.slice(crumbs.length - 1 - middleVisible, crumbs.length - 1)
    : crumbs.slice(0, crumbs.length - 1);
  const hiddenCrumbs = hasOverflow
    ? crumbs.slice(0, crumbs.length - 1 - middleVisible)
    : [];
  const lastCrumb = crumbs[crumbs.length - 1];

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className="truncate flex-nowrap">
        {/* Home (always first) */}
        <BreadcrumbItem>
          <BreadcrumbLink href={routes.dashboard} className="select-none">
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Hidden crumbs dropdown (if overflowed) */}
        {hasOverflow && hiddenCrumbs.length > 0 && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="text-muted-foreground select-none text-sm">
                  ...
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {hiddenCrumbs.map((crumb, i) => (
                    <DropdownMenuItem key={i} asChild>
                      {crumb.path ? (
                        <Link href={crumb.path}>{crumb.label}</Link>
                      ) : (
                        <span>{crumb.label}</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
          </>
        )}

        {/* Inline middle crumbs (either from full or sliced) */}
        {middleCrumbs.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.path ? (
                <BreadcrumbLink
                  asChild
                  className="max-w-20 truncate md:max-w-none select-none"
                >
                  <Link href={item.path}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage
                  className={cn(
                    "max-w-20 truncate md:max-w-none select-none",
                    "text-muted-foreground",
                  )}
                >
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}

        {/* Final crumb (if overflowed) */}
        {hasOverflow && lastCrumb && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {lastCrumb.path ? (
                <BreadcrumbLink
                  asChild
                  className="max-w-20 truncate md:max-w-none select-none"
                >
                  <Link href={lastCrumb.path}>{lastCrumb.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate select-none">
                  {lastCrumb.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}

        {/* If not overflowed, render last crumb normally */}
        {!hasOverflow && crumbs.length > 0 && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {crumbs[crumbs.length - 1].path ? (
                <BreadcrumbLink
                  asChild
                  className="max-w-20 truncate md:max-w-none select-none"
                >
                  <Link href={crumbs[crumbs.length - 1].path!}>
                    {crumbs[crumbs.length - 1].label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate select-none">
                  {crumbs[crumbs.length - 1].label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
