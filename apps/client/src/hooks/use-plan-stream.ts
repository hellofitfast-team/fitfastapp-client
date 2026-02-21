import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Hook to get the stream body for a plan being generated.
 * Uses the persistent text streaming component for real-time updates.
 * Returns null when no streamId, or stream body with text + status.
 */
export function usePlanStream(streamId: string | undefined) {
  const streamBody = useQuery(
    api.streamingManager.getStreamBodyPublic,
    streamId ? { streamId } : "skip",
  );

  return {
    streamedText: streamBody?.text ?? "",
    status: streamBody?.status ?? "pending",
    isStreaming:
      streamBody?.status === "streaming" ||
      streamBody?.status === "pending",
  };
}
