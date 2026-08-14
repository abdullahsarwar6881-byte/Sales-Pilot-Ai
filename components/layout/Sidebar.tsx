"use client";

import Logo from "./Logo";
import SidebarItem from "./SidebarItem";
import { navigation } from "@/lib/navigation";

export default function Sidebar() {
  return (
    <aside
      className="
        fixed
        left-0
        top-0
        z-40
        flex
        h-screen
        w-72
        flex-col
        border-r
        border-theme
        bg-sidebar
        text-sidebar-foreground
        transition-colors
      "
    >
      {/* -------------------------------- */}
      {/* LOGO */}
      {/* -------------------------------- */}

      <div
        className="
          border-b
          border-theme
          px-6
          py-6
        "
      >
        <Logo />
      </div>

      {/* -------------------------------- */}
      {/* NAVIGATION */}
      {/* -------------------------------- */}

      <nav
        className="
          flex-1
          space-y-2
          overflow-y-auto
          px-4
          py-6
        "
      >
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

      <div
        className="
          border-t
          border-theme
          p-5
        "
      >
        <div
          className="
            rounded-2xl
            bg-gradient-to-r
            from-indigo-600
            to-violet-600
            p-5
            text-white
          "
        >
          <p
            className="
              text-sm
              font-semibold
            "
          >
            Upgrade to Pro
          </p>

          <p
            className="
              mt-2
              text-xs
              text-indigo-100
            "
          >
            Unlock AI automation,
            analytics and unlimited
            conversations.
          </p>

          <button
            type="button"
            className="
              mt-4
              w-full
              rounded-xl
              bg-white
              py-2
              text-sm
              font-semibold
              text-indigo-700
              transition
              hover:bg-slate-100
            "
          >
            Upgrade
          </button>
        </div>
      </div>
    </aside>
  );
}