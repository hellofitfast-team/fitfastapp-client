"use node";

import { RAG } from "@convex-dev/rag";
import { components } from "./_generated/api";

/**
 * Singleton RAG client. Embedding model uses OpenRouter → text-embedding-3-small.
 * The provider is created lazily at first use (inside Node actions) since
 * process.env is only available at runtime in the Node environment.
 */
function createRagClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createOpenRouter } = require("@openrouter/ai-sdk-provider") as typeof import("@openrouter/ai-sdk-provider");
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY!,
  });

  return new RAG(components.rag, {
    textEmbeddingModel: openrouter.textEmbeddingModel(
      "openai/text-embedding-3-small",
    ),
    embeddingDimension: 1536,
  });
}

let _ragClient: RAG | null = null;

export function getRagClient(): RAG {
  if (!_ragClient) {
    _ragClient = createRagClient();
  }
  return _ragClient;
}
