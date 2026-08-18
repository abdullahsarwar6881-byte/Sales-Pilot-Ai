"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import WidgetStats from "@/components/widget/WidgetStats";
import WidgetPreview from "@/components/widget/WidgetPreview";
import WidgetSettings from "@/components/widget/WidgetSettings";
import WidgetAppearance from "@/components/widget/WidgetAppearance";
import WidgetBehavior from "@/components/widget/WidgetBehavior";
import WidgetCode from "@/components/widget/WidgetCode";
import WidgetInstall from "@/components/widget/WidgetInstall";

export default function WidgetStudioPage() {
  const supabase = createClient();

  // =====================================================
  // PROFILE
  // =====================================================

  const [profileId, setProfileId] = useState("");

  // =====================================================
  // WIDGET APPEARANCE SETTINGS
  // =====================================================

  const [aiName, setAiName] =
    useState("Sales Pilot AI");

  const [welcomeMessage, setWelcomeMessage] =
    useState(
      "👋 Hi! How can I help you today?"
    );

  const [brandColor, setBrandColor] =
    useState("#6366F1");

  const [position, setPosition] =
    useState("Bottom Right");

  const [theme, setTheme] =
    useState("Light");

  const [size, setSize] =
    useState("Medium");

  const [radius, setRadius] =
    useState("Rounded");

  // =====================================================
  // SAVE STATE
  // =====================================================

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  // =====================================================
  // LOAD WIDGET
  // =====================================================

  useEffect(() => {
    loadWidget();
  }, []);

  async function loadWidget() {
    try {
      // -------------------------------------------------
      // GET AUTHENTICATED USER
      // -------------------------------------------------

      const {
        data: { user },
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError) {
        console.error(
          "Widget Studio authentication error:",
          authError
        );

        return;
      }

      if (!user) {
        console.error(
          "Widget Studio: No authenticated user."
        );

        return;
      }

      // -------------------------------------------------
      // PROFILE ID
      // -------------------------------------------------

      setProfileId(user.id);

      // -------------------------------------------------
      // LOAD WIDGET SETTINGS
      // -------------------------------------------------

      const {
        data,
        error,
      } =
        await supabase
          .from("widget_settings")
          .select("*")
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (error) {
        console.error(
          "Failed to load widget settings:",
          {
            message:
              error.message,

            details:
              error.details,

            hint:
              error.hint,

            code:
              error.code,
          }
        );

        return;
      }

      // -------------------------------------------------
      // NO SETTINGS
      // -------------------------------------------------

      if (!data) {
        console.log(
          "Widget Studio: No widget settings found. Using defaults."
        );

        return;
      }

      // =================================================
      // APPLY SAVED SETTINGS
      // =================================================

      setAiName(
        data.ai_name ??
          "Sales Pilot AI"
      );

      setWelcomeMessage(
        data.welcome_message ??
          "👋 Hi! How can I help you today?"
      );

      setBrandColor(
        data.brand_color ??
          "#6366F1"
      );

      setPosition(
        data.position ??
          "Bottom Right"
      );

      setTheme(
        data.theme ??
          "Light"
      );

      setSize(
        data.size ??
          "Medium"
      );

      setRadius(
        data.radius ??
          "Rounded"
      );

      console.log(
        "Widget Studio settings loaded:",
        data
      );
    } catch (error) {
      console.error(
        "Widget Studio loading error:",
        error
      );
    }
  }

  // =====================================================
  // SAVE WIDGET APPEARANCE
  // =====================================================

  async function saveWidget() {
    if (saving) {
      return;
    }

    setSaving(true);
    setSaved(false);

    try {
      // -------------------------------------------------
      // GET CURRENT USER
      // -------------------------------------------------

      const {
        data: { user },
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError) {
        console.error(
          "Widget save authentication error:",
          authError
        );

        return;
      }

      if (!user) {
        console.error(
          "Widget save: No authenticated user."
        );

        return;
      }

      // -------------------------------------------------
      // CLEAN VALUES
      // -------------------------------------------------

      const cleanAiName =
        aiName.trim() ||
        "Sales Pilot AI";

      const cleanWelcomeMessage =
        welcomeMessage.trim() ||
        "👋 Hi! How can I help you today?";

      const cleanBrandColor =
        brandColor ||
        "#6366F1";

      const cleanPosition =
        position ||
        "Bottom Right";

      const cleanTheme =
        theme ||
        "Light";

      const cleanSize =
        size ||
        "Medium";

      const cleanRadius =
        radius ||
        "Rounded";

      // -------------------------------------------------
      // DATA
      // -------------------------------------------------

      const widgetData = {
        user_id:
          user.id,

        ai_name:
          cleanAiName,

        welcome_message:
          cleanWelcomeMessage,

        brand_color:
          cleanBrandColor,

        position:
          cleanPosition,

        theme:
          cleanTheme,

        size:
          cleanSize,

        radius:
          cleanRadius,

        updated_at:
          new Date().toISOString(),
      };

      console.log(
        "Saving Widget Studio settings:",
        widgetData
      );

      // -------------------------------------------------
      // UPSERT
      // -------------------------------------------------

      const {
        data,
        error,
      } =
        await supabase
          .from("widget_settings")
          .upsert(
            widgetData,
            {
              onConflict:
                "user_id",
            }
          )
          .select()
          .single();

      // -------------------------------------------------
      // HANDLE ERROR
      // -------------------------------------------------

      if (error) {
        console.error(
          "Widget Studio save error:",
          {
            message:
              error.message,

            details:
              error.details,

            hint:
              error.hint,

            code:
              error.code,
          }
        );

        return;
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      console.log(
        "Widget Studio saved successfully:",
        data
      );

      // -------------------------------------------------
      // APPLY SAVED VALUES
      // -------------------------------------------------

      setAiName(
        data.ai_name ??
          cleanAiName
      );

      setWelcomeMessage(
        data.welcome_message ??
          cleanWelcomeMessage
      );

      setBrandColor(
        data.brand_color ??
          cleanBrandColor
      );

      setPosition(
        data.position ??
          cleanPosition
      );

      setTheme(
        data.theme ??
          cleanTheme
      );

      setSize(
        data.size ??
          cleanSize
      );

      setRadius(
        data.radius ??
          cleanRadius
      );

      setSaved(true);

      // -------------------------------------------------
      // REMOVE SUCCESS MESSAGE
      // -------------------------------------------------

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error(
        "Unexpected Widget Studio save error:",
        error
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div
      className="
        min-w-0
        space-y-8
        text-slate-900
        transition-colors
        duration-200
        dark:text-slate-100
      "
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div>
        <h1
          className="
            text-4xl
            font-bold
            text-slate-900
            transition-colors
            duration-200
            dark:text-white
          "
        >
          Widget Studio
        </h1>

        <p
          className="
            mt-2
            text-slate-500
            transition-colors
            duration-200
            dark:text-slate-400
          "
        >
          Customize your AI widget and
          install it on any website.
        </p>
      </div>

      {/* =================================================
          STATS
      ================================================= */}

      <WidgetStats
        conversations={0}
        resolution={0}
        visitors={0}
        views={0}
      />

      {/* =================================================
          PREVIEW + SETTINGS
      ================================================= */}

      <div
        className="
          grid
          min-w-0
          gap-6
          xl:grid-cols-2
        "
      >
        {/* ===============================================
            REAL LIVE PREVIEW
        =============================================== */}

        <div className="min-w-0">
          <WidgetPreview
            profileId={
              profileId
            }

            aiName={
              aiName
            }

            welcomeMessage={
              welcomeMessage
            }

            brandColor={
              brandColor
            }

            theme={
              theme
            }

            size={
              size
            }

            radius={
              radius
            }

            position={
              position
            }

            autoOpen={
              true
            }

            showTypingIndicator={
              true
            }

            showAiAvatar={
              true
            }

            enableAnimations={
              true
            }

            showPoweredBy={
              true
            }
          />
        </div>

        {/* ===============================================
            SETTINGS
        =============================================== */}

        <div
          className="
            min-w-0
            space-y-6
          "
        >
          <WidgetSettings
            aiName={
              aiName
            }

            setAiName={
              setAiName
            }

            welcomeMessage={
              welcomeMessage
            }

            setWelcomeMessage={
              setWelcomeMessage
            }

            brandColor={
              brandColor
            }

            setBrandColor={
              setBrandColor
            }
          />

          <WidgetAppearance
            position={
              position
            }

            setPosition={
              setPosition
            }

            theme={
              theme
            }

            setTheme={
              setTheme
            }

            size={
              size
            }

            setSize={
              setSize
            }

            radius={
              radius
            }

            setRadius={
              setRadius
            }
          />
        </div>
      </div>

      {/* =================================================
          BEHAVIOR
      ================================================= */}

      <WidgetBehavior />

      {/* =================================================
          SAVE
      ================================================= */}

      <div
        className="
          space-y-3
        "
      >
        <button
          type="button"
          onClick={
            saveWidget
          }
          disabled={
            saving
          }
          className="
            w-full
            rounded-xl
            bg-indigo-600
            px-6
            py-3
            font-semibold
            text-white
            shadow-sm
            transition
            hover:bg-indigo-700
            disabled:cursor-not-allowed
            disabled:opacity-50
            dark:bg-indigo-600
            dark:hover:bg-indigo-500
          "
        >
          {saving
            ? "Saving..."
            : saved
              ? "✓ Widget Saved"
              : "Save Widget"}
        </button>

        {saved && (
          <p
            className="
              text-center
              text-sm
              font-medium
              text-emerald-600
              dark:text-emerald-400
            "
          >
            Your widget settings have
            been saved successfully.
          </p>
        )}
      </div>

      {/* =================================================
          EMBED CODE
      ================================================= */}

      <WidgetCode
        profileId={
          profileId
        }
      />

      {/* =================================================
          INSTALLATION
      ================================================= */}

      <WidgetInstall
        profileId={
          profileId
        }
      />
    </div>
  );
}