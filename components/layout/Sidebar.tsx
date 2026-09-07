"use client";

import Link from "next/link";
import Logo from "./Logo";
import SidebarItem from "./SidebarItem";
import { navigation } from "@/lib/navigation";
import { useSearchParams } from "next/navigation";
import { Crown, ArrowRight } from "lucide-react";

export default function Sidebar() {
  const searchParams = useSearchParams();
  const search = searchParams?.toString();
  const billingHref = search ? `/dashboard/billing?${search}` : "/dashboard/billing";

  return (
    <aside
      className="
        fixed
        left-0
        top-0
        z-40
        flex
        h-screen
        w-60
        lg:w-64
        flex-col
        border-r
        border-slate-200/80
        dark:border-white/10
        bg-white
        dark:bg-[#090b10]
        text-slate-900
        dark:text-slate-100
        transition-colors
        duration-200
      "
    >
      {/* -------------------------------- */}
      {/* LOGO */}
      {/* -------------------------------- */}
      <div className="px-6 py-6 border-b border-slate-100 dark:border-white/5">
        <Logo />
      </div>

      {/* -------------------------------- */}
      {/* NAVIGATION */}
      {/* -------------------------------- */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6">
        {navigation.map((item) => (
          <SidebarItem
            key={item.href}
            title={item.title}
            href={item.href}
            icon={item.icon}
          />
        ))}
      </nav>

      {/* -------------------------------- */}
      {/* UPGRADE CARD */}
      {/* -------------------------------- */}
      <div className="p-4 border-t border-slate-100 dark:border-white/5">
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-[#12151d] p-4 relative overflow-hidden group">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
            <Crown className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
            <span>Upgrade to Pro</span>
          </div>

          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
            Unlock AI automation, analytics and unlimited conversations.
          </p>

          <Link
            href={billingHref}
            className="
              mt-3.5
              flex
              w-full
              items-center
              justify-center
              gap-1.5
              rounded-xl
              bg-gradient-to-r
              from-[#5B3DF5]
              to-[#7C5CFC]
              hover:from-[#4E2DE8]
              hover:to-[#6B4BE8]
              py-2.5
              text-xs
              font-bold
              text-white
              shadow-sm
              shadow-[#5B3DF5]/20
              transition-all
              duration-150
              hover:scale-[1.01]
              active:scale-[0.98]
            "
          >
            <span>Upgrade</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </aside>
  );
}