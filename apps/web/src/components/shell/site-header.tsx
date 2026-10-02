"use client";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { generatePath } from "@/lib/utils";
import { breadCrumbs } from "@/routes";
import {
  IconBook,
  IconBrandDiscord,
  IconBrandGithub,
  IconCoffee,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Breadcrumbs, { TBreadcrumb } from "./breadcrumbs";

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

        <div className="ml-auto flex gap-2 lg:gap-4">
          <Link
            href="https://github.com/MRegterschot/gocontrolpanel/wiki"
            target="_blank"
          >
            <IconBook />
          </Link>
          <Link href="https://discord.gg/NjbtRvbCY8" target="_blank">
            <IconBrandDiscord />
          </Link>
          <Link href="https://ko-fi.com/marijnregterschot" target="_blank">
            <IconCoffee />
          </Link>
          <Link
            href="https://github.com/MRegterschot/gocontrolpanel"
            target="_blank"
          >
            <IconBrandGithub />
          </Link>
        </div>
      </div>
    </header>
  );
}
