import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, AiSummary, AiSection } from '@/lib/db/types';

type Client = SupabaseClient<Database>;

export const aiKeys = {
  all: ['ai'] as const,
  summary: (section: AiSection) => [...aiKeys.all, 'summary', section] as const,
};

export async function getSummary(client: Client, section: AiSection): Promise<AiSummary | null> {
  const { data, error } = await client
    .from('ai_summaries')
    .select('*')
    .eq('section', section)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertSummary(
  client: Client,
  userId: string,
  section: AiSection,
  content: string,
  model: string,
): Promise<AiSummary> {
  const { data, error } = await client
    .from('ai_summaries')
    .upsert(
      {
        user_id: userId,
        section,
        content,
        model,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,section' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
