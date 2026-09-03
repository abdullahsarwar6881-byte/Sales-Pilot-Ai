"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";

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

  const active =
    pathname === href ||
    pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`
        group
        flex
        items-center
        gap-3
        rounded-xl
        px-3.5
        py-2.5
        transition-all
        duration-150
        ease-out
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-indigo-500

        ${
          active
            ? `
              bg-gradient-to-r
              from-indigo-600
              to-violet-600
              text-white
              shadow-sm
              active:scale-[0.98]
              active:brightness-95
            `
            : `
              text-muted-foreground
              hover:bg-hover
              hover:text-foreground
              active:scale-[0.98]
              active:bg-slate-200/70
              dark:active:bg-slate-800/80
              active:text-foreground
            `
        }
      `}
    >
      <Icon
        size={18}
        className="
          shrink-0
          transition-colors
        "
      />

      <span className="font-medium text-sm">
        {title}
      </span>
    </Link>
  );
}