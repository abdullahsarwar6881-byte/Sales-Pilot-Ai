"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface LogoProps {
  collapsed?: boolean;
}

export default function Logo({
  collapsed = false,
}: LogoProps) {
  const searchParams = useSearchParams();
  const search = searchParams?.toString();
  const targetHref = search ? `/dashboard?${search}` : "/dashboard";

  return (
    <Link
      href={targetHref}
      className="flex items-center gap-3 group"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B3DF5] text-white font-black text-xl shadow-md shadow-[#5B3DF5]/20 transition-transform duration-200 group-hover:scale-105 shrink-0">
        S
      </div>

      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Sales Pilot
          </span>

          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
            AI Customer Support
          </span>
        </div>
      )}
    </Link>
  );
}