import { createClient } from "@/lib/supabase/server";

export async function getKnowledgePages() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("knowledge_pages")
    .select(`
      id,
      url,
      page_type,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}