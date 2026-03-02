import type { Page, Request, Response, ConsoleMessage } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Observability Log entry — one line in the JSONL file.
 * Follows the ObservabilityEntry schema from data-model.md.
 */
export interface ObservabilityEntry {
  timestamp: string;
  phase: string;
  locale: "en" | "ar";
  type: "request" | "response" | "mutation" | "ai_call" | "console" | "screenshot" | "assertion";
  url?: string;
  method?: string;
  status?: number;
  latencyMs?: number;
  mutationName?: string;
  args?: Record<string, unknown>;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  aiLatencyMs?: number;
  level?: "log" | "warn" | "error" | "info";
  message?: string;
  path?: string;
  description?: string;
  assertion?: string;
  passed?: boolean;
}

/**
 * Classifies a URL into an ObservabilityEntry type.
 *
 * URL Pattern rules (from data-model.md):
 * - POST to /api/mutation → "mutation"
 * - openrouter.ai or /api/action with AI path → "ai_call"
 * - Everything else → "request" / "response"
 */
function classifyUrl(url: string, method: string): "mutation" | "ai_call" | "request" {
  if (method === "POST" && url.includes("/api/mutation")) {
    return "mutation";
  }
  if (
    url.includes("openrouter.ai") ||
    (url.includes("/api/action") && (url.includes("ai") || url.includes("generate")))
  ) {
    return "ai_call";
  }
  return "request";
}

/**
 * Extract the Convex mutation function name from the URL.
 * Convex HTTP mutation URLs look like: /api/mutation/moduleName:functionName
 */
function extractMutationName(url: string): string | undefined {
  const match = url.match(/\/api\/mutation\/(.+?)(?:\?|$)/);
  return match?.[1];
}

/**
 * Tracks response start times for latency calculation.
 */
const requestTimings = new Map<string, number>();

/**
 * ObservabilityRecorder attaches to a Playwright Page and records all
 * network requests, responses, console messages, screenshots, and assertions
 * to a JSONL file. Each entry is appended atomically (crash-safe).
 */
export class ObservabilityRecorder {
  private outputPath: string;
  private phase: string;
  private locale: "en" | "ar";
  private page: Page | null = null;

  constructor(opts: { outputDir: string; locale: "en" | "ar"; phase?: string }) {
    this.locale = opts.locale;
    this.phase = opts.phase ?? "A";

    const filename = `${opts.locale}-log.jsonl`;
    this.outputPath = path.join(opts.outputDir, filename);

    fs.mkdirSync(opts.outputDir, { recursive: true });
  }

  /** Update the current simulation phase (A–G). */
  setPhase(phase: string): void {
    this.phase = phase;
  }

  /** Attach listeners to a Playwright page. */
  attach(page: Page): void {
    this.page = page;

    page.on("request", (req: Request) => this.onRequest(req));
    page.on("response", (res: Response) => this.onResponse(res));
    page.on("console", (msg: ConsoleMessage) => this.onConsole(msg));
  }

  /** Detach is implicit — Playwright cleans up page listeners on close. */
  detach(): void {
    this.page = null;
  }

  /** Record a screenshot event. */
  recordScreenshot(screenshotPath: string, description: string): void {
    this.append({
      timestamp: new Date().toISOString(),
      phase: this.phase,
      locale: this.locale,
      type: "screenshot",
      path: screenshotPath,
      description,
    });
  }

  /** Record an assertion event. */
  recordAssertion(assertion: string, passed: boolean): void {
    this.append({
      timestamp: new Date().toISOString(),
      phase: this.phase,
      locale: this.locale,
      type: "assertion",
      assertion,
      passed,
    });
  }

  /** Get the output file path. */
  getOutputPath(): string {
    return this.outputPath;
  }

  /** Get all entries (for post-test validation). */
  readEntries(): ObservabilityEntry[] {
    try {
      const content = fs.readFileSync(this.outputPath, "utf-8");
      return content
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as ObservabilityEntry);
    } catch {
      return [];
    }
  }

  private onRequest(req: Request): void {
    const url = req.url();
    const method = req.method();

    // Skip data URLs, chrome-extension, etc.
    if (!url.startsWith("http")) return;

    requestTimings.set(url + method, Date.now());

    const type = classifyUrl(url, method);

    const entry: ObservabilityEntry = {
      timestamp: new Date().toISOString(),
      phase: this.phase,
      locale: this.locale,
      type: type === "request" ? "request" : type,
      url,
      method,
    };

    if (type === "mutation") {
      entry.mutationName = extractMutationName(url);
    }

    this.append(entry);
  }

  private onResponse(res: Response): void {
    const url = res.url();
    const method = res.request().method();

    if (!url.startsWith("http")) return;

    const startTime = requestTimings.get(url + method);
    const latencyMs = startTime ? Date.now() - startTime : undefined;
    requestTimings.delete(url + method);

    const type = classifyUrl(url, method);

    const entry: ObservabilityEntry = {
      timestamp: new Date().toISOString(),
      phase: this.phase,
      locale: this.locale,
      type: type === "ai_call" ? "ai_call" : "response",
      url,
      method,
      status: res.status(),
      latencyMs,
    };

    if (type === "ai_call") {
      entry.aiLatencyMs = latencyMs;
      // Try to extract token counts from headers if available
      const promptTokens = res.headers()["x-prompt-tokens"];
      const completionTokens = res.headers()["x-completion-tokens"];
      if (promptTokens) entry.promptTokens = parseInt(promptTokens, 10);
      if (completionTokens) entry.completionTokens = parseInt(completionTokens, 10);
    }

    this.append(entry);
  }

  private onConsole(msg: ConsoleMessage): void {
    const level = msg.type() as "log" | "warn" | "error" | "info";
    const text = msg.text();

    // Only record meaningful levels
    if (!["log", "warn", "error", "info"].includes(level)) return;

    this.append({
      timestamp: new Date().toISOString(),
      phase: this.phase,
      locale: this.locale,
      type: "console",
      level,
      message: text.substring(0, 500), // Truncate at 500 chars per data-model.md
    });
  }

  private append(entry: ObservabilityEntry): void {
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(this.outputPath, line, "utf-8");
  }
}
