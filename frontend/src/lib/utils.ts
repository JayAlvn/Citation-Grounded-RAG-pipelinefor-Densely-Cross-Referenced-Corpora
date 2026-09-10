import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** One retrieved passage: its relevance plus where in the document it came from.
 *  The location fields are absent for documents indexed before structural
 *  metadata existed, so every consumer treats them as optional. */
export type RetrievalItem = {
  source: string;
  score: number;
  page?: number;
  recital?: number;
  article?: number;
  chapter?: string;
  document?: string;
};

/** Readable provenance for a citation card: "p. 37 · recital 148". */
export function locationLabel(item?: RetrievalItem): string {
  if (!item) return '';
  const parts: string[] = [];
  if (item.page !== undefined) parts.push(`p. ${item.page}`);
  if (item.recital !== undefined) parts.push(`recital ${item.recital}`);
  if (item.article !== undefined) parts.push(`Article ${item.article}`);
  if (item.chapter) parts.push(`Ch. ${item.chapter}`);
  return parts.join(' · ');
}

/** Same thing abbreviated, for the narrow chart axis: "p.37 §148". */
export function shortLocation(item?: RetrievalItem): string {
  if (!item) return '';
  const page = item.page !== undefined ? `p.${item.page}` : '';
  if (item.recital !== undefined) return `${page} §${item.recital}`.trim();
  if (item.article !== undefined) return `${page} Art.${item.article}`.trim();
  return page;
}

/* ── Conversation turns ──────────────────────────────────────────────────── */

export type Risk = { level: string; score: number; factors: { name: string; weight: number }[] };
export type Confidence = { level: string; score: number };
export type Usage = {
  prompt_tokens: number; completion_tokens: number;
  total_tokens: number; context_window: number;
};

/** Everything the panes need to redisplay one answer without re-querying the
 *  backend. Captured per turn so the transcript can act as an index into past
 *  evidence rather than a second copy of the latest answer. */
export type Turn = {
  finding: string;
  citations: string[];
  retrieval: RetrievalItem[];
  risk: Risk;
  confidence: Confidence;
  usage: Usage;
  timings: { retrieval_ms: number; generation_ms: number } | null;
  ms: number;
};

export type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  /** Present only on assistant turns that succeeded. Its absence is what makes
   *  a bubble non-clickable -- errors and user messages have nothing to restore. */
  turn?: Turn;
};

/* ── Document structure ──────────────────────────────────────────────────── */

/** What GET /document/{name}/stats returns. Every key beyond `chunks` is
 *  optional: the backend omits a key entirely when the document has none of
 *  that unit, so a .txt file carries no `articles` and a cover page no
 *  `chapters`. Render what arrives rather than defaulting absent keys to 0. */
export type DocStats = {
  chunks: number;
  pages?: number;
  articles?: number;
  recitals?: number;
  chapters?: number;
};

/** The structural units of a document, as one line: "144 pages · 113 articles".
 *  Chunks are omitted -- they are an implementation detail already shown above,
 *  not a property of the source document. */
export function structuralSummary(stats: DocStats): string {
  const parts: string[] = [];

  if (stats.pages) parts.push(`${stats.pages} pages`);
  if (stats.chapters) parts.push(`${stats.chapters} chapters`);
  if (stats.articles) parts.push(`${stats.articles} articles`);
  if (stats.recitals) parts.push(`${stats.recitals} recitals`);

  return parts.join(' · ');
}

/** Structural stats for one indexed document. Returns null when the document
 *  is unknown to the backend or the call fails -- the caller renders nothing. */
export async function fetchDocStats(name: string): Promise<DocStats | null> {
  try {
    const res = await fetch(
      `http://localhost:8000/document/${encodeURIComponent(name)}/stats`,
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || typeof data.chunks !== 'number') return null;

    return data as DocStats;
  } catch {
    return null;
  }
}

/** Strip Private Use Area characters (U+E000–U+F8FF).
 *
 *  PDFs that draw bullets with Symbol or Wingdings map those glyphs into the
 *  PUA, and they survive text extraction as boxes -- U+F0A1 appears 52 times in
 *  Architecture.pdf alone. Applied at render time so documents already indexed
 *  display correctly without being re-ingested. */
export function stripPua(text: string): string {
  return text.replace(/[\uE000-\uF8FF]/g, '');
}
