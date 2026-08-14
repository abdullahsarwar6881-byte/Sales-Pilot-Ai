import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// =====================================================
// FORCE THIS API TO ALWAYS READ FRESH DATA
// =====================================================

export const dynamic = "force-dynamic";
export const revalidate = 0;

// =====================================================
// GET WIDGET CONFIGURATION
// =====================================================

export async function GET(
  request: NextRequest
) {
  try {
    // =================================================
    // PROFILE ID
    // =================================================

    const { searchParams } =
      new URL(request.url);

    const profileId =
      searchParams.get("profileId");

    console.log(
      "========================================"
    );

    console.log(
      "Widget Config API"
    );

    console.log(
      "Profile ID:",
      profileId
    );

    if (!profileId) {
      return NextResponse.json(
        {
          error:
            "profileId is required",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // ENVIRONMENT
    // =================================================

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      console.error(
        "Missing NEXT_PUBLIC_SUPABASE_URL"
      );

      return NextResponse.json(
        {
          error:
            "Supabase URL is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    if (!serviceRoleKey) {
      console.error(
        "Missing SUPABASE_SERVICE_ROLE_KEY"
      );

      return NextResponse.json(
        {
          error:
            "Supabase service role key is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    // =================================================
    // SUPABASE SERVER CLIENT
    // =================================================

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    // =================================================
    // LOAD EXACT WIDGET SETTINGS ROW
    // =================================================

    const {
      data,
      error,
    } = await supabase
      .from("widget_settings")
      .select(
        `
          user_id,

          ai_name,
          welcome_message,
          brand_color,
          position,
          theme,
          size,
          radius,

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
        profileId
      )
      .maybeSingle();

    // =================================================
    // DATABASE ERROR
    // =================================================

    if (error) {
      console.error(
        "Widget Config DB ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Failed to load widget configuration.",
        },
        {
          status: 500,
        }
      );
    }

    // =================================================
    // VERY IMPORTANT DEBUG
    // =================================================

    console.log(
      "RAW DATABASE ROW:"
    );

    console.log(
      JSON.stringify(
        data,
        null,
        2
      )
    );

    // =================================================
    // DEFAULTS
    // =================================================

    const defaultConfig = {
      aiName:
        "Sales Pilot AI",

      welcomeMessage:
        "👋 Hi! How can I help you today?",

      brandColor:
        "#6366F1",

      position:
        "Bottom Right",

      theme:
        "Light",

      size:
        "Medium",

      radius:
        "Rounded",

      autoOpen:
        false,

      showTypingIndicator:
        true,

      soundNotifications:
        false,

      showAiAvatar:
        true,

      collectVisitorName:
        false,

      collectVisitorEmail:
        false,

      enableAnimations:
        true,

      showPoweredBy:
        true,
    };

    // =================================================
    // NO ROW
    // =================================================

    if (!data) {
      console.log(
        "No widget_settings row found."
      );

      return NextResponse.json(
        defaultConfig,
        {
          status: 200,

          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",

            Pragma:
              "no-cache",

            Expires:
              "0",
          },
        }
      );
    }

    // =================================================
    // BUILD CONFIG
    // =================================================

    const config = {
      aiName:
        data.ai_name ??
        defaultConfig.aiName,

      welcomeMessage:
        data.welcome_message ??
        defaultConfig.welcomeMessage,

      brandColor:
        data.brand_color ??
        defaultConfig.brandColor,

      position:
        data.position ??
        defaultConfig.position,

      theme:
        data.theme ??
        defaultConfig.theme,

      size:
        data.size ??
        defaultConfig.size,

      radius:
        data.radius ??
        defaultConfig.radius,

      autoOpen:
        data.auto_open ??
        defaultConfig.autoOpen,

      showTypingIndicator:
        data.show_typing_indicator ??
        defaultConfig.showTypingIndicator,

      soundNotifications:
        data.sound_notifications ??
        defaultConfig.soundNotifications,

      showAiAvatar:
        data.show_ai_avatar ??
        defaultConfig.showAiAvatar,

      collectVisitorName:
        data.collect_visitor_name ??
        defaultConfig.collectVisitorName,

      collectVisitorEmail:
        data.collect_visitor_email ??
        defaultConfig.collectVisitorEmail,

      enableAnimations:
        data.enable_animations ??
        defaultConfig.enableAnimations,

      showPoweredBy:
        data.show_powered_by ??
        defaultConfig.showPoweredBy,
    };

    // =================================================
    // FINAL DEBUG
    // =================================================

    console.log(
      "FINAL CONFIG:"
    );

    console.log(
      JSON.stringify(
        config,
        null,
        2
      )
    );

    console.log(
      "collect_visitor_name from DB:",
      data.collect_visitor_name
    );

    console.log(
      "collectVisitorName sent to widget:",
      config.collectVisitorName
    );

    console.log(
      "========================================"
    );

    // =================================================
    // RESPONSE
    // =================================================

    return NextResponse.json(
      config,
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma:
            "no-cache",

          Expires:
            "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Widget Config API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}