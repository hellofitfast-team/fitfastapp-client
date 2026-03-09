/**
 * Incremental JSON day-block parser for streaming meal plans.
 * Extracts complete "dayN": {...} blocks from partial JSON using brace-depth tracking.
 * O(new_chars) — only scans text since lastParsedOffset.
 */

export interface ParseState {
  lastParsedOffset: number;
  parsedDays: Map<string, unknown>;
}

export function createParseState(): ParseState {
  return { lastParsedOffset: 0, parsedDays: new Map() };
}

/**
 * Parse newly arrived text for complete day blocks.
 * Mutates state.lastParsedOffset and state.parsedDays in place.
 */
export function parseIncrementalDays(text: string, state: ParseState): void {
  const { lastParsedOffset } = state;
  if (text.length <= lastParsedOffset) return;

  // Scan from where we left off
  const dayKeyRegex = /"(day\d+)"\s*:\s*\{/g;
  dayKeyRegex.lastIndex = Math.max(0, lastParsedOffset - 20); // small overlap for safety

  let match: RegExpExecArray | null;
  while ((match = dayKeyRegex.exec(text)) !== null) {
    const dayKey = match[1];
    if (state.parsedDays.has(dayKey)) continue;

    const braceStart = match.index + match[0].length - 1; // position of opening {
    let depth = 1;
    let i = braceStart + 1;
    let inString = false;
    let escaped = false;

    while (i < text.length && depth > 0) {
      const ch = text[i];
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = !inString;
      } else if (!inString) {
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
      }
      i++;
    }

    if (depth === 0) {
      // Found a complete block
      const blockJson = text.substring(braceStart, i);
      try {
        const parsed = JSON.parse(blockJson);
        state.parsedDays.set(dayKey, parsed);
        state.lastParsedOffset = Math.max(state.lastParsedOffset, i);
      } catch {
        // Incomplete or malformed — skip, will retry on next chunk
      }
    }
  }
}
