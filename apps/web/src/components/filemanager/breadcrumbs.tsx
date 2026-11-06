import { TBreadcrumb } from "@/components/shell/breadcrumbs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { generatePath } from "@/lib/utils";
import { routes } from "@/routes";
import { IconHome } from "@tabler/icons-react";
import Link from "next/link";
import React from "react";

interface BreadcrumbsProps {
  crumbs: TBreadcrumb[];
  serverId: string;
  className?: string;
}

export default function FilesBreadcrumbs({
  crumbs,
  serverId,
  className,
}: BreadcrumbsProps) {
  const isMobile = useIsMobile();
  const maxVisibleItems = isMobile ? 3 : 4;

  const totalLength = crumbs.length + 1; // Home + crumbs
  const hasOverflow = totalLength > maxVisibleItems;

  const middleVisible = maxVisibleItems - 2;
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
        {/* Home Link */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={generatePath(routes.servers.files, { id: serverId })}>
              <IconHome size={20} />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Dropdown for hidden crumbs if overflowed */}
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
                        <Link
                          href={`${generatePath(routes.servers.files, {
                            id: serverId,
                          })}?path=${crumb.path}`}
                        >
                          {crumb.label}
                        </Link>
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

        {/* Middle visible crumbs */}
        {middleCrumbs.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.path ? (
                <BreadcrumbLink
                  asChild
                  className="max-w-32 truncate md:max-w-none select-none"
                >
                  <Link
                    href={`${generatePath(routes.servers.files, {
                      id: serverId,
                    })}?path=${item.path}`}
                  >
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="max-w-32 truncate md:max-w-none select-none">
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}

        {/* Final crumb */}
        {lastCrumb && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {lastCrumb.path ? (
                <BreadcrumbLink
                  asChild
                  className="max-w-32 truncate md:max-w-none select-none"
                >
                  <Link
                    href={`${generatePath(routes.servers.files, {
                      id: serverId,
                    })}?path=${lastCrumb.path}`}
                  >
                    {lastCrumb.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate select-none">
                  {lastCrumb.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
