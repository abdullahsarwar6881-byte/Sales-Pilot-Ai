"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Bell,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Moon,
  Sun,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";

export default function Navbar() {
  const supabase = createClient();
  const router = useRouter();

  const { theme, setTheme } = useTheme();

  const [name, setName] = useState("User");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const menuRef =
    useRef<HTMLDivElement>(null);

  // ----------------------------------------
  // LOAD USER
  // ----------------------------------------

  useEffect(() => {
    setMounted(true);

    loadUser();

    function handleClickOutside(
      event: MouseEvent
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );
    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  // ----------------------------------------
  // LOAD PROFILE
  // ----------------------------------------

  async function loadUser() {
    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      setEmail(user.email ?? "");

      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select(
          "full_name, avatar_url"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error(
          "Failed to load profile:",
          error
        );
      }

      if (data) {
        setName(
          data.full_name || "User"
        );

        setAvatar(
          data.avatar_url || ""
        );
      } else {
        setName(
          user.email?.split("@")[0] ||
            "User"
        );
      }
    } catch (error) {
      console.error(
        "Profile loading error:",
        error
      );
    }
  }

  // ----------------------------------------
  // LOGOUT
  // ----------------------------------------

  async function logout() {
    await supabase.auth.signOut();

    router.push("/login");
  }

  // ----------------------------------------
  // THEME
  // ----------------------------------------

  function toggleTheme() {
    setTheme(
      theme === "dark"
        ? "light"
        : "dark"
    );
  }

  const isDark =
    mounted && theme === "dark";

  return (
    <header
      className="
        sticky
        top-0
        z-30
        flex
        h-[72px]
        items-center
        justify-between
        border-b
        border-theme
        bg-background/90
        px-6
        backdrop-blur
        transition-colors
      "
    >
      {/* ================================= */}
      {/* SEARCH */}
      {/* ================================= */}

      <div
        className="
          flex
          items-center
          gap-3
          rounded-xl
          border
          border-theme
          bg-input
          px-4
          py-2
          transition-all
          duration-150
          focus-within:border-indigo-500
          focus-within:ring-2
          focus-within:ring-indigo-500/20
        "
      >
        <Search
          size={18}
          className="
            text-muted-foreground
          "
        />

        <input
          type="text"
          placeholder="Search..."
          className="
            w-64
            bg-transparent
            text-sm
            text-input-foreground
            outline-none
            placeholder:text-muted-foreground
          "
        />
      </div>

      {/* ================================= */}
      {/* RIGHT SIDE */}
      {/* ================================= */}

      <div
        className="
          flex
          items-center
          gap-3
        "
      >
        {/* ================================= */}
        {/* THEME BUTTON */}
        {/* ================================= */}

        <button
          type="button"
          onClick={toggleTheme}
          disabled={!mounted}
          aria-label={
            isDark
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          title={
            isDark
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-xl
            border
            border-theme
            bg-input
            text-foreground
            transition-all
            duration-150
            hover:bg-hover
            active:scale-95
            active:bg-slate-200/70
            dark:active:bg-slate-700/70
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-indigo-500
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {isDark ? (
            <Sun size={19} />
          ) : (
            <Moon size={19} />
          )}
        </button>

        {/* ================================= */}
        {/* NOTIFICATIONS */}
        {/* ================================= */}

        <NotificationDropdown />

        {/* ================================= */}
        {/* SETTINGS */}
        {/* ================================= */}

        <button
          type="button"
          aria-label="Settings"
          onClick={() =>
            router.push(
              "/dashboard/settings"
            )
          }
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-xl
            border
            border-theme
            bg-input
            text-foreground
            transition-all
            duration-150
            hover:bg-hover
            active:scale-95
            active:bg-slate-200/70
            dark:active:bg-slate-700/70
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-indigo-500
          "
        >
          <Settings size={19} />
        </button>

        {/* ================================= */}
        {/* PROFILE */}
        {/* ================================= */}

        <div
          className="relative"
          ref={menuRef}
        >
          <button
            type="button"
            onClick={() =>
              setOpen(!open)
            }
            aria-expanded={open}
            aria-haspopup="menu"
            className="
              flex
              items-center
              gap-3
              rounded-xl
              border
              border-theme
              bg-input
              px-3
              py-2
              text-input-foreground
              transition-all
              duration-150
              hover:bg-hover
              active:scale-[0.98]
              active:bg-slate-200/60
              dark:active:bg-slate-700/60
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-indigo-500
            "
          >
            {/* Avatar */}

            {avatar ? (
              <img
                src={avatar}
                alt="avatar"
                className="
                  h-9
                  w-9
                  rounded-full
                  object-cover
                "
              />
            ) : (
              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  bg-indigo-600
                  text-sm
                  font-bold
                  text-white
                "
              >
                {name
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            {/* User Information */}

            <div
              className="
                hidden
                text-left
                md:block
              "
            >
              <p
                className="
                  text-sm
                  font-semibold
                  text-foreground
                "
              >
                {name}
              </p>

              <p
                className="
                  text-xs
                  text-muted-foreground
                "
              >
                Administrator
              </p>
            </div>

            <ChevronDown
              size={16}
              className="
                text-muted-foreground
              "
            />
          </button>

          {/* ================================= */}
          {/* PROFILE DROPDOWN */}
          {/* ================================= */}

          {open && (
            <div
              className="
                absolute
                right-0
                mt-3
                w-64
                rounded-xl
                border
                border-theme
                bg-card
                p-3
                text-card-foreground
                shadow-xl
                transition-colors
              "
            >
              {/* User Information */}

              <div
                className="
                  border-b
                  border-theme
                  pb-3
                "
              >
                <p
                  className="
                    font-semibold
                    text-foreground
                  "
                >
                  {name}
                </p>

                <p
                  className="
                    text-sm
                    text-muted-foreground
                  "
                >
                  {email}
                </p>
              </div>

              {/* Profile */}

              <button
                type="button"
                onClick={() => {
                  setOpen(false);

                  router.push(
                    "/dashboard/profile"
                  );
                }}
                className="
                  mt-2
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-lg
                  px-3
                  py-2
                  text-muted-foreground
                  transition
                  hover:bg-hover
                  hover:text-foreground
                "
              >
                <User size={17} />

                Profile
              </button>

              {/* Settings */}

              <button
                type="button"
                onClick={() => {
                  setOpen(false);

                  router.push(
                    "/dashboard/settings"
                  );
                }}
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-lg
                  px-3
                  py-2
                  text-muted-foreground
                  transition
                  hover:bg-hover
                  hover:text-foreground
                "
              >
                <Settings size={17} />

                Settings
              </button>

              {/* Logout */}

              <button
                type="button"
                onClick={logout}
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-lg
                  px-3
                  py-2
                  text-red-600
                  transition
                  hover:bg-red-50
                  dark:text-red-400
                  dark:hover:bg-red-950/40
                "
              >
                <LogOut size={17} />

                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}