"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const options = [
  {
    key: "autoOpen",
    label: "Open widget automatically",
    description:
      "Automatically open the chat widget when a visitor enters the website.",
  },
  {
    key: "typing",
    label: "Show typing indicator",
    description:
      "Show a typing animation while the AI is preparing a response.",
  },
  {
    key: "sound",
    label: "Play sound notifications",
    description:
      "Play a sound when the AI sends a new message.",
  },
  {
    key: "avatar",
    label: "Show AI avatar",
    description:
      "Show the AI avatar beside AI messages.",
  },
  {
    key: "name",
    label: "Collect visitor name",
    description:
      "Ask visitors for their name before starting the conversation.",
  },
  {
    key: "email",
    label: "Collect visitor email",
    description:
      "Ask visitors for their email address.",
  },
  {
    key: "animation",
    label: "Enable animations",
    description:
      "Enable animations inside the chat widget.",
  },
  {
    key: "branding",
    label: "Show 'Powered by Sales Pilot'",
    description:
      "Show Sales Pilot branding inside the widget.",
  },
] as const;

type SettingKey = (typeof options)[number]["key"];

type Settings = {
  autoOpen: boolean;
  typing: boolean;
  sound: boolean;
  avatar: boolean;
  name: boolean;
  email: boolean;
  animation: boolean;
  branding: boolean;
};

const defaultSettings: Settings = {
  autoOpen: false,
  typing: true,
  sound: false,
  avatar: true,
  name: false,
  email: false,
  animation: true,
  branding: true,
};

export default function WidgetBehavior() {
  const supabase = createClient();

  const [settings, setSettings] =
    useState<Settings>(defaultSettings);

  const [loading, setLoading] =
    useState(true);

  const [savingKey, setSavingKey] =
    useState<SettingKey | null>(null);

  // =====================================================
  // LOAD SETTINGS
  // =====================================================

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError) {
        console.error(
          "Widget Behavior authentication error:",
          authError
        );

        return;
      }

      if (!user) {
        console.error(
          "Widget Behavior: No authenticated user."
        );

        return;
      }

      // IMPORTANT:
      // Behavior settings are stored in
      // widget_settings, NOT profiles.

      const {
        data,
        error,
      } = await supabase
        .from("widget_settings")
        .select(
          `
            auto_open,
            show_typing_indicator,
            sound_notifications,
            show_ai_avatar,
            collect_visitor_name,
            collect_visitor_email,
            enable_animations,
            show_powered_by
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

      if (error) {
        console.error(
          "Failed to load widget behavior settings:",
          {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          }
        );

        return;
      }

      if (!data) {
        console.log(
          "No widget behavior settings found. Using defaults."
        );

        return;
      }

      setSettings({
        autoOpen:
          data.auto_open ??
          defaultSettings.autoOpen,

        typing:
          data.show_typing_indicator ??
          defaultSettings.typing,

        sound:
          data.sound_notifications ??
          defaultSettings.sound,

        avatar:
          data.show_ai_avatar ??
          defaultSettings.avatar,

        name:
          data.collect_visitor_name ??
          defaultSettings.name,

        email:
          data.collect_visitor_email ??
          defaultSettings.email,

        animation:
          data.enable_animations ??
          defaultSettings.animation,

        branding:
          data.show_powered_by ??
          defaultSettings.branding,
      });

      console.log(
        "Widget behavior settings loaded:",
        data
      );
    } catch (error) {
      console.error(
        "Widget behavior loading error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // TOGGLE SETTING
  // =====================================================

  async function toggle(
    key: SettingKey
  ) {
    if (savingKey) {
      return;
    }

    const newValue =
      !settings[key];

    // ---------------------------------------------
    // UPDATE UI IMMEDIATELY
    // ---------------------------------------------

    setSettings((previous) => ({
      ...previous,
      [key]: newValue,
    }));

    setSavingKey(key);

    try {
      const {
        data: { user },
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          "No authenticated user."
        );
      }

      // ---------------------------------------------
      // MAP UI KEY → DATABASE COLUMN
      // ---------------------------------------------

      const columnMap: Record<
        SettingKey,
        string
      > = {
        autoOpen:
          "auto_open",

        typing:
          "show_typing_indicator",

        sound:
          "sound_notifications",

        avatar:
          "show_ai_avatar",

        name:
          "collect_visitor_name",

        email:
          "collect_visitor_email",

        animation:
          "enable_animations",

        branding:
          "show_powered_by",
      };

      const column =
        columnMap[key];

      // ---------------------------------------------
      // SAVE TO widget_settings
      // ---------------------------------------------

      const {
        error,
      } = await supabase
        .from("widget_settings")
        .update({
          [column]: newValue,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "user_id",
          user.id
        );

      if (error) {
        throw error;
      }

      console.log(
        `Widget behavior "${key}" saved:`,
        newValue
      );
    } catch (error) {
      console.error(
        "Failed to save widget behavior:",
        error
      );

      // ---------------------------------------------
      // ROLLBACK UI IF SAVE FAILED
      // ---------------------------------------------

      setSettings((previous) => ({
        ...previous,
        [key]: !newValue,
      }));

      alert(
        "Failed to save widget behavior. Please try again."
      );
    } finally {
      setSavingKey(null);
    }
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className="
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-6
        shadow-sm
        dark:border-slate-700
        dark:bg-slate-900
      "
    >
      {/* HEADER */}

      <h2
        className="
          text-xl
          font-bold
          text-slate-900
          dark:text-white
        "
      >
        Widget Behavior
      </h2>

      <p
        className="
          mt-1
          text-sm
          text-slate-500
          dark:text-slate-400
        "
      >
        Configure how the chat widget behaves
        for visitors.
      </p>

      {/* SETTINGS */}

      <div className="mt-8 space-y-5">
        {options.map((option) => {
          const key =
            option.key;

          const enabled =
            settings[key];

          const saving =
            savingKey === key;

          return (
            <div
              key={key}
              className="
                flex
                items-center
                justify-between
                gap-6
                rounded-2xl
                border
                border-slate-200
                p-5
                transition
                dark:border-slate-700
                dark:bg-slate-950
              "
            >
              {/* TEXT */}

              <div className="min-w-0">
                <h3
                  className="
                    font-semibold
                    text-slate-900
                    dark:text-white
                  "
                >
                  {option.label}
                </h3>

                <p
                  className="
                    mt-1
                    text-sm
                    text-slate-500
                    dark:text-slate-400
                  "
                >
                  {option.description}
                </p>
              </div>

              {/* SWITCH */}

              <button
                type="button"
                aria-label={
                  enabled
                    ? `Disable ${option.label}`
                    : `Enable ${option.label}`
                }
                aria-pressed={
                  enabled
                }
                disabled={saving || loading}
                onClick={() =>
                  toggle(key)
                }
                className={`
                  relative
                  h-7
                  w-12
                  flex-shrink-0
                  rounded-full
                  transition
                  ${
                    enabled
                      ? "bg-indigo-600"
                      : "bg-slate-300"
                  }
                  ${
                    saving
                      ? "cursor-wait opacity-60"
                      : "cursor-pointer"
                  }
                  dark:${
                    enabled
                      ? "bg-indigo-500"
                      : "bg-slate-600"
                  }
                `}
              >
                <span
                  className={`
                    absolute
                    top-1
                    h-5
                    w-5
                    rounded-full
                    bg-white
                    shadow-sm
                    transition
                    ${
                      enabled
                        ? "left-6"
                        : "left-1"
                    }
                  `}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}