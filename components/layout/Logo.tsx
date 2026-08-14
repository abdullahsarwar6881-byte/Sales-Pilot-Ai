"use client";

import Link from "next/link";

interface LogoProps {
  collapsed?: boolean;
}

export default function Logo({
  collapsed = false,
}: LogoProps) {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-3"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-500 to-blue-500 shadow-lg shadow-indigo-200 transition-transform duration-300 hover:scale-105">
        <span className="bg-gradient-to-br from-white to-slate-100 bg-clip-text text-2xl font-black tracking-tight text-transparent">
          S
        </span>
      </div>

      {!collapsed && (
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Sales Pilot
          </span>

          <span className="-mt-1 text-xs text-slate-500">
            AI Customer Support
          </span>
        </div>
      )}
    </Link>
  );
}