/**
 * Pure helper for hashtag extraction, filtering and aggregation.
 * Supports English and Bangla Unicode characters in hashtags.
 */

import type { Expense } from './expenses';

export type TagBreakdownItem = {
  tag: string;
  totalCents: number;
  count: number;
  categories: string[];
};

export type TagSummary = {
  items: TagBreakdownItem[];
  totalTaggedCents: number;
  uniqueTagsCount: number;
};

// Matches hashtags: alphanumeric, underscores, hyphens, and Bangla script (\u0980-\u09FF)
const TAG_REGEX = /#([a-zA-Z0-9_\u0980-\u09FF-]+)/g;

/**
 * Extracts normalized, unique hashtags from a note string.
 * Strips leading hash and converts Latin characters to lowercase.
 */
export function extractTags(note?: string | null): string[] {
  if (!note || typeof note !== 'string') return [];
  const matches = note.match(TAG_REGEX);
  if (!matches) return [];

  const unique = new Set<string>();
  for (const m of matches) {
    const clean = m.slice(1).trim().toLowerCase();
    if (clean) unique.add(clean);
  }
  return Array.from(unique);
}

/**
 * Checks if a note contains a specific tag (case-insensitive).
 */
export function hasTag(note: string | undefined | null, targetTag: string): boolean {
  if (!note || !targetTag) return false;
  const normalizedTarget = targetTag.replace(/^#/, '').trim().toLowerCase();
  const tags = extractTags(note);
  return tags.includes(normalizedTarget);
}

/**
 * Aggregates expenses by their extracted hashtags.
 * If an expense has multiple tags, its amount is attributed to each tag.
 */
export function calculateTagBreakdown(expenses: Expense[]): TagSummary {
  const map = new Map<string, { totalCents: number; count: number; categories: Set<string> }>();
  let totalTaggedCents = 0;

  for (const expense of expenses) {
    const tags = extractTags(expense.note);
    if (tags.length > 0) {
      totalTaggedCents += expense.cents;
    }

    for (const tag of tags) {
      const existing = map.get(tag);
      if (existing) {
        existing.totalCents += expense.cents;
        existing.count += 1;
        existing.categories.add(expense.category);
      } else {
        map.set(tag, {
          totalCents: expense.cents,
          count: 1,
          categories: new Set([expense.category]),
        });
      }
    }
  }

  const items: TagBreakdownItem[] = Array.from(map.entries())
    .map(([tag, data]) => ({
      tag,
      totalCents: data.totalCents,
      count: data.count,
      categories: Array.from(data.categories).sort(),
    }))
    .sort((a, b) => b.totalCents - a.totalCents || a.tag.localeCompare(b.tag));

  return {
    items,
    totalTaggedCents,
    uniqueTagsCount: items.length,
  };
}

/**
 * Returns a frequency-sorted list of all unique tags present across entries.
 */
export function getUniqueTagsList(entries: { note?: string }[]): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const tags = extractTags(entry.note);
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
}
