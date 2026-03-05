import "server-only";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { AI_MODEL } from "@/lib/constants";

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!appUrl) {
  throw new Error("NEXT_PUBLIC_APP_URL environment variable is required");
}

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": appUrl,
    "X-Title": "FitFast",
  },
});

export const DEEPSEEK_MODEL = AI_MODEL;
export const QWEN_VISION_MODEL = "qwen/qwen3-vl-8b-instruct";

export function getModel(modelId: string = DEEPSEEK_MODEL) {
  return openrouter(modelId);
}
