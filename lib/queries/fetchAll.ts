import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Supabase hands back at most 1,000 rows per request (the project's API
 * "max rows") and says nothing when it stops — a goal reading a long history
 * would just lose its tail. Ask in pages of exactly that size: a page that
 * comes back short is the last one.
 *
 * Keep PAGE equal to the project's max rows. If that setting is ever lowered,
 * every page comes back short and this stops after the first one.
 */
const PAGE = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;

/**
 * Every row of a query, page by page. `page` builds the query fresh for each
 * range — a builder runs once — and must order by a unique column (end with
 * `.order('id')`), or rows can repeat or go missing between pages.
 *
 * Costs one extra round trip per 1,000 rows, and none until a table gets there.
 */
export async function fetchAll<T>(page: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE) return rows;
  }
}
