"use node";

import { RAG } from "@convex-dev/rag";
import { components } from "./_generated/api";

/**
 * Singleton RAG client. Uses OpenAI text-embedding-3-small via OpenRouter.
 *
 * IMPORTANT: Changing the model or dimension is a breaking change — existing
 * embeddings become incompatible and all documents must be re-embedded.
 * Current production embeddings use text-embedding-3-small at 1536 dims.
 *
 * The provider is created lazily at first use (inside Node actions) since
 * process.env is only available at runtime in the Node environment.
 */
function createRagClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createOpenRouter } =
    require("@openrouter/ai-sdk-provider") as typeof import("@openrouter/ai-sdk-provider");
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY!,
  });

  return new RAG<{ tag: string }>(components.rag, {
    textEmbeddingModel: openrouter.textEmbeddingModel("openai/text-embedding-3-small"),
    embeddingDimension: 1536,
    filterNames: ["tag"],
  });
}

let _ragClient: RAG<{ tag: string }> | null = null;

export function getRagClient(): RAG<{ tag: string }> {
  if (!_ragClient) {
    _ragClient = createRagClient();
  }
  return _ragClient;
}
