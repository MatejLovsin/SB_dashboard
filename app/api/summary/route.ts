import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { anthropic } from '@/lib/ai/claude';
import { buildFitnessPrompt, buildSchoolPrompt, buildWorkPrompt } from '@/lib/ai/prompts';
import { listSessions } from '@/lib/queries/analytics';
import { listUpcomingExamsWithProgress } from '@/lib/queries/school';
import { listCards, listNotes } from '@/lib/queries/work';
import { upsertSummary } from '@/lib/queries/ai';
import type { AiSection } from '@/lib/db/types';

const MODEL = 'claude-sonnet-4-6';
const VALID_SECTIONS: AiSection[] = ['fitness', 'school', 'work'];

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { section?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawSection = body.section;
  if (typeof rawSection !== 'string' || !VALID_SECTIONS.includes(rawSection as AiSection)) {
    return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
  }
  const section = rawSection as AiSection;

  let system: string;
  let userMsg: string;

  try {
    if (section === 'fitness') {
      const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const sessions = await listSessions(supabase, { from, limit: 20 });
      ({ system, userMsg } = buildFitnessPrompt(sessions));
    } else if (section === 'school') {
      const exams = await listUpcomingExamsWithProgress(supabase);
      ({ system, userMsg } = buildSchoolPrompt(exams));
    } else {
      const [cards, notes] = await Promise.all([listCards(supabase), listNotes(supabase)]);
      ({ system, userMsg } = buildWorkPrompt(cards, notes));
    }
  } catch (e) {
    console.error('[summary] data fetch error:', e);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }

  let content: string;
  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: [
        { type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } },
      ],
      messages: [{ role: 'user', content: userMsg }],
    });
    content = message.content[0].type === 'text' ? message.content[0].text : '';
  } catch (e) {
    console.error('[summary] Claude API error:', e);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
  }

  try {
    const saved = await upsertSummary(supabase, user.id, section, content, MODEL);
    return NextResponse.json({ content: saved.content, generated_at: saved.generated_at });
  } catch (e) {
    console.error('[summary] upsert error:', e);
    return NextResponse.json({ content, generated_at: new Date().toISOString() });
  }
}
