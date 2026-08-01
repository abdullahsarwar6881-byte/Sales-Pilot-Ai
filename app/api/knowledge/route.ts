import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Read environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL in your .env.local file."
  );
}

if (!supabaseKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in your .env.local file."
  );
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Insert a new knowledge base record
    const { data: insertedItem, error: insertError } = await supabase
      .from("knowledge_base")
      .insert([
        {
          page_url: url,
          sync_status: "Scanning",
          page_content: "AI is reading contextual data...",
        },
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Simulate scraping process
    setTimeout(async () => {
      const simulatedText = `Extracted layout text from ${url}. Product catalog, pricing matrix, and FAQ guidelines processed successfully for Sales Pilot context parameters.`;

      await supabase
        .from("knowledge_base")
        .update({
          sync_status: "Completed",
          page_content: simulatedText,
          last_synchronized: new Date().toISOString(),
        })
        .eq("id", insertedItem.id);
    }, 5000);

    return NextResponse.json({
      success: true,
      message: "Sync sequence initiated successfully.",
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown server error",
      },
      { status: 500 }
    );
  }
}