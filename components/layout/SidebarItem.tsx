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
        px-4
        py-3
        transition-all
        duration-200

        ${
          active
            ? `
              bg-gradient-to-r
              from-indigo-600
              to-violet-600
              text-white
              shadow-lg
            `
            : `
              text-muted-foreground
              hover:bg-hover
              hover:text-foreground
            `
        }
      `}
    >
      <Icon
        size={19}
        className="
          shrink-0
          transition-colors
        "
      />

      <span className="font-medium">
        {title}
      </span>
    </Link>
  );
}