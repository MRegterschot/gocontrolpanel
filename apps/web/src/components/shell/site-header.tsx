"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { generatePath } from "@/lib/utils";
import { breadCrumbs, routes } from "@/routes";
import {
  IconApi,
  IconBook,
  IconBrandDiscord,
  IconBrandGithub,
  IconCoffee,
  IconDotsVertical,
} from "@tabler/icons-react";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Breadcrumbs, { TBreadcrumb } from "./breadcrumbs";

const headerLinks = [
  {
    label: "Wiki",
    href: "https://github.com/MRegterschot/gocontrolpanel/wiki",
    icon: IconBook,
  },
  { label: "API reference", href: routes.apiDocs, icon: IconApi },
  {
    label: "Discord",
    href: "https://discord.gg/NjbtRvbCY8",
    icon: IconBrandDiscord,
  },
  {
    label: "Ko-fi",
    href: "https://ko-fi.com/marijnregterschot",
    icon: IconCoffee,
  },
  {
    label: "GitHub",
    href: "https://github.com/MRegterschot/gocontrolpanel",
    icon: IconBrandGithub,
  },
];

export function SiteHeader() {
  const pathname = usePathname();
  const params = useParams();

  const [activeBreadCrumbs, setActiveBreadCrumbs] = useState<TBreadcrumb[]>([]);

  const getUpdatedBreadCrumbs = (path: string): TBreadcrumb[] | null => {
    const dynamicParams = params as Record<string, string | number>;

    const dynamicPath = generatePath(path, dynamicParams);

    if (dynamicPath === pathname) {
      let breadcrumb = breadCrumbs.find((item) => item.path === path);
      if (!breadcrumb) return null;

      breadcrumb = {
        path: generatePath(breadcrumb.path, dynamicParams),
        breadCrumbs: breadcrumb.breadCrumbs.map((crumb) => {
          const updatedCrumb = { ...crumb };
          if (updatedCrumb.path) {
            updatedCrumb.path = generatePath(updatedCrumb.path, dynamicParams);
          }
          return updatedCrumb;
        }),
      };

      return breadcrumb.breadCrumbs;
    }

    return null;
  };

  useEffect(() => {
    setActiveBreadCrumbs(
      breadCrumbs
        .map((item) => getUpdatedBreadCrumbs(item.path))
        .find((crumbs) => crumbs !== null) || [],
    );
  }, [pathname, params]);

  return (
    <header
      className="flex h-(--header-height) shrink-0 items-center gap-2 border-b 
    transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)
    sticky! z-10 top-0 bg-white/20 p-2 backdrop-blur-sm dark:bg-black/40 rounded-t-xl"
    >
      <div className="flex w-full items-center gap-1 px-2 lg:gap-2">
        <SidebarTrigger />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        <Breadcrumbs crumbs={activeBreadCrumbs} className="min-w-0 flex-1" />

        <div className="ml-auto hidden gap-2 md:flex lg:gap-4">
          {headerLinks.map(({ label, href, icon: Icon }) => (
            <a key={label} href={href} target="_blank" title={label}>
              <Icon />
            </a>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto md:hidden"
              aria-label="Links"
            >
              <IconDotsVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {headerLinks.map(({ label, href, icon: Icon }) => (
              <DropdownMenuItem key={label} asChild>
                <a href={href} target="_blank">
                  <Icon />
                  {label}
                </a>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
