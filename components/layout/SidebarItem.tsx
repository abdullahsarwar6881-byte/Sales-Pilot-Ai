"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

interface SidebarItemProps {
  title: string;
  href: string;
  icon: LucideIcon;
}

export default function SidebarItem({
  title,
  href,
  icon: Icon,
}: SidebarItemProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const active =
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href + "/"));

  const search = searchParams?.toString();
  const targetHref = search ? `${href}?${search}` : href;

  return (
    <Link
      href={targetHref}
      className={`
        group
        flex
        items-center
        gap-3.5
        rounded-2xl
        px-4
        py-3
        transition-all
        duration-150
        ease-out
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-[#5B3DF5]
        text-sm
        ${
          active
            ? `
              bg-gradient-to-r
              from-[#5B3DF5]
              to-[#7C5CFC]
              text-white
              font-bold
              shadow-md
              shadow-[#5B3DF5]/25
              active:scale-[0.99]
            `
            : `
              text-slate-600
              dark:text-slate-400
              hover:bg-slate-100/70
              dark:hover:bg-white/5
              hover:text-slate-900
              dark:hover:text-white
              font-semibold
              active:scale-[0.99]
            `
        }
      `}
    >
      <Icon
        size={19}
        className={`
          shrink-0
          transition-colors
          ${active ? "text-white" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200"}
        `}
      />

      <span className="truncate">{title}</span>
    </Link>
  );
}