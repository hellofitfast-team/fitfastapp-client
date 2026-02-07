/**
 * OpenRouter API Client
 * Uses DeepSeek V3 for meal and workout plan generation
 */

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "deepseek/deepseek-chat"; // DeepSeek V3

export class OpenRouterClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || "";

    if (!this.apiKey) {
      console.warn("OpenRouter API key not configured");
    }
  }

  async chat(
    messages: OpenRouterMessage[],
    options: {
      temperature?: number;
      max_tokens?: number;
      model?: string;
    } = {}
  ): Promise<string> {
    const {
      temperature = 0.7,
      max_tokens = 4000,
      model = MODEL,
    } = options;

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "FitFast",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data: OpenRouterResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from OpenRouter");
    }

    return data.choices[0].message.content;
  }

  /**
   * Generate a completion with a simple prompt
   */
  async complete(
    prompt: string,
    systemPrompt?: string,
    options?: {
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<string> {
    const messages: OpenRouterMessage[] = [];

    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    messages.push({
      role: "user",
      content: prompt,
    });

    return this.chat(messages, options);
  }
}

// Singleton instance
let openRouterClient: OpenRouterClient | null = null;

export function getOpenRouterClient(): OpenRouterClient {
  if (!openRouterClient) {
    openRouterClient = new OpenRouterClient();
  }
  return openRouterClient;
}
