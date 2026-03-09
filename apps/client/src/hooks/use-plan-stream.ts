import { useQuery } from "convex/react";
import { useRef, useMemo } from "react";
import { api } from "@/convex/_generated/api";
import { createParseState, parseIncrementalDays, type ParseState } from "@/lib/streaming-parser";

/**
 * Hook to get the stream body for a plan being generated.
 * Uses the persistent text streaming component for real-time updates.
 * Returns null when no streamId, or stream body with text + status.
 * Also returns incrementally parsed day blocks for progressive rendering.
 */
export function usePlanStream(streamId: string | undefined) {
  const streamBody = useQuery(
    api.streamingManager.getStreamBodyPublic,
    streamId ? { streamId } : "skip",
  );

  const parseStateRef = useRef<ParseState>(createParseState());

  // Reset parse state when streamId changes
  const lastStreamId = useRef(streamId);
  if (streamId !== lastStreamId.current) {
    parseStateRef.current = createParseState();
    lastStreamId.current = streamId;
  }

  const streamedText = streamBody?.text ?? "";

  // Update the incremental parse state synchronously during render so
  // the snapshot below always reflects the current streamedText.
  if (streamedText) {
    parseIncrementalDays(streamedText, parseStateRef.current);
  }

  // Create an immutable snapshot for consumers (new Map triggers re-render diff)
  const parsedDays = useMemo(() => {
    if (!streamedText) return new Map<string, unknown>();
    return new Map(parseStateRef.current.parsedDays);
  }, [streamedText]);

  return {
    streamedText,
    status: streamBody?.status ?? "pending",
    isStreaming: streamBody?.status === "streaming" || streamBody?.status === "pending",
    parsedDays,
  };
}
