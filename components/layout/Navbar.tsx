"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Moon,
  Sun,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";

export default function Navbar() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { theme, setTheme } = useTheme();

  const getPreservedUrl = (path: string) => {
    const search = searchParams?.toString();
    return search ? `${path}?${search}` : path;
  };

  const [name, setName] = useState("User");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);

  // ----------------------------------------
  // LOAD USER
  // ----------------------------------------
  useEffect(() => {
    setMounted(true);
    loadUser();

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const searchInput = document.getElementById("global-search-input");
        searchInput?.focus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // ----------------------------------------
  // LOAD PROFILE
  // ----------------------------------------
  async function loadUser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setEmail(user.email ?? "");

      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (data?.full_name) {
        setName(data.full_name);
        setAvatar(data.avatar_url || "");
      } else if (user.user_metadata?.full_name) {
        setName(user.user_metadata.full_name);
      } else if (user.email) {
        setName(user.email.split("@")[0]);
      }
    } catch (error) {
      console.error("Profile loading error:", error);
    }
  }

  // ----------------------------------------
  // LOGOUT
  // ----------------------------------------
  async function logout() {
    await supabase.auth.signOut();
    router.push(getPreservedUrl("/login"));
  }

  // ----------------------------------------
  // THEME
  // ----------------------------------------
  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  const isDark = mounted && theme === "dark";

  return (
    <header className="sticky top-0 z-30 flex h-[74px] items-center justify-between border-b border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#090b10]/90 px-6 sm:px-8 backdrop-blur-md transition-colors duration-200">
      {/* ================================= */}
      {/* SEARCH */}
      {/* ================================= */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] px-4 py-2.5 transition-all duration-150 focus-within:border-[#5B3DF5] focus-within:ring-2 focus-within:ring-[#5B3DF5]/15 w-72 sm:w-96 shadow-2xs">
        <Search size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />

        <input
          id="global-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations, knowledge, or settings..."
          className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
        />

        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-slate-200/70 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
          ⌘ K
        </kbd>
      </div>

      {/* ================================= */}
      {/* RIGHT SIDE ACTIONS */}
      {/* ================================= */}
      <div className="flex items-center gap-3">
        {/* THEME BUTTON */}
        <button
          type="button"
          onClick={toggleTheme}
          disabled={!mounted}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-150 active:scale-95 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3DF5]"
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* NOTIFICATIONS */}
        <NotificationDropdown />

        {/* SETTINGS */}
        <button
          type="button"
          aria-label="Settings"
          onClick={() => router.push(getPreservedUrl("/dashboard/settings"))}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-150 active:scale-95 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3DF5]"
        >
          <Settings size={17} />
        </button>

        {/* USER PROFILE */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-haspopup="menu"
            className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] px-3 py-1.5 transition-all duration-150 hover:bg-slate-50 dark:hover:bg-white/5 active:scale-[0.98] shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3DF5]"
          >
            {/* Avatar */}
            {avatar ? (
              <img
                src={avatar}
                alt="avatar"
                className="h-8 w-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5B3DF5] text-xs font-black text-white shadow-xs shrink-0">
                {name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* User Info */}
            <div className="hidden md:block text-left min-w-0 pr-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px] leading-tight">
                {name}
              </p>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
                Administrator
              </p>
            </div>

            <ChevronDown size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
          </button>

          {/* PROFILE DROPDOWN MENU */}
          {open && (
            <div className="absolute right-0 mt-3 w-60 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] p-2.5 text-slate-900 dark:text-slate-100 shadow-xl shadow-indigo-500/5 dark:shadow-black/40 transition-all z-50">
              <div className="px-3 py-2.5 border-b border-slate-100 dark:border-white/5">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {name}
                </p>
                <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {email}
                </p>
              </div>

              <div className="mt-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(getPreservedUrl("/dashboard/profile"));
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <User size={15} />
                  <span>Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(getPreservedUrl("/dashboard/settings"));
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <Settings size={15} />
                  <span>Settings</span>
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}