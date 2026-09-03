// lib/widget/ensureWidgetSettings.ts
// Ensures a widget_settings row exists for the given merchant (user) and returns its public_id.
// Uses the server‑side Supabase client (no anon key) and respects existing RLS policies.

import { createClient } from '@/lib/supabase/server';

export async function ensureWidgetSettings(userId: string): Promise<string> {
  const supabase = await createClient();

  // Attempt to fetch existing widget settings for this user
  const { data: existing, error: fetchError } = await supabase
    .from('widget_settings')
    .select('public_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching widget settings:', fetchError);
    throw new Error('Failed to ensure widget settings');
  }

  if (existing && existing.public_id) {
    return existing.public_id;
  }

  // No existing row – create one. The migration 0005_add_widget_public_id.sql added a default
  // `public_id` generation using gen_random_uuid().
  const { data: created, error: createError } = await supabase
    .from('widget_settings')
    .insert({ user_id: userId })
    .select('public_id')
    .single();

  if (createError || !created) {
    console.error('Error creating widget settings:', createError);
    throw new Error('Failed to create widget settings');
  }

  return created.public_id;
}

