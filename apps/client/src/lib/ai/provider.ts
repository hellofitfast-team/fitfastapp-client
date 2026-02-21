import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "FitFast",
  },
});

export const DEEPSEEK_MODEL = "deepseek/deepseek-chat";
export const QWEN_VISION_MODEL = "qwen/qwen2.5-vl-72b-instruct";

export function getModel(modelId: string = DEEPSEEK_MODEL) {
  return openrouter(modelId);
}
