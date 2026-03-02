import type { Page } from "@playwright/test";

interface ArabicViolation {
  text: string;
  tagName: string;
  xpath: string;
}

interface ArabicValidationResult {
  violations: ArabicViolation[];
  isClean: boolean;
}

// Brand names, tech abbreviations, and UI labels acceptable in Arabic pages
const WHITELIST_WORDS = [
  // Brand
  "FitFast",
  // Tech / abbreviations
  "AI",
  "PWA",
  "PNG",
  "JPG",
  "WEBP",
  "MB",
  "KB",
  "URL",
  "HTTP",
  "HTTPS",
  "PDF",
  "OCR",
  "BMI",
  "TDEE",
  "AM",
  "PM",
  // Units
  "kg",
  "cm",
  "lbs",
  "kcal",
  "cal",
  "g",
  "mg",
  "ml",
  "EGP",
  // Language toggles
  "EN",
  "AR",
  // Nutritional macro abbreviations
  "P",
  "C",
  "F",
];

// Patterns for content that is legitimately non-Arabic
const EXEMPT_PATTERNS = [
  // Language toggle buttons
  /^(EN|AR)$/,
  // User initials in avatars (1-3 uppercase letters)
  /^[A-Z]{1,3}$/,
  // Macro ratios like "45P / 60C / 15F"
  /^\d+[PCF]\s*\/\s*\d+[PCF]\s*\/\s*\d+[PCF]$/,
  // Email addresses
  /^[\w.+-]+@[\w.-]+\.\w+$/,
  // URLs
  /^https?:\/\//,
];

/**
 * Walk visible text nodes in the page and flag any Latin characters
 * that are not whitelisted or exempt by pattern.
 *
 * This validator is designed for Arabic page testing. It checks:
 * - Latin letters that aren't in the whitelist
 *
 * It does NOT flag:
 * - Western digits (0-9) — most Arabic websites use Western digits
 * - User names / dynamic DB content — detected via context heuristics
 * - AI-generated content (meal/workout names from LLM output)
 */
export async function validateArabicPage(page: Page): Promise<ArabicValidationResult> {
  const violations = await page.evaluate(
    ({ whitelist, exemptPatterns }: { whitelist: string[]; exemptPatterns: string[] }) => {
      const results: ArabicViolation[] = [];
      const latinRegex = /[A-Za-z]+/g;

      // Build whitelist set (case-insensitive)
      const whitelistLower = new Set(whitelist.map((w) => w.toLowerCase()));
      const exemptRegexes = exemptPatterns.map((p) => new RegExp(p));

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const el = node.parentElement;
          if (!el) return NodeFilter.FILTER_REJECT;

          // Skip hidden elements, scripts, styles
          const tag = el.tagName.toLowerCase();
          if (tag === "script" || tag === "style" || tag === "noscript") {
            return NodeFilter.FILTER_REJECT;
          }

          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip aria-hidden elements
          if (el.getAttribute("aria-hidden") === "true") {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      });

      function getXPath(el: Element): string {
        const parts: string[] = [];
        let current: Element | null = el;
        while (current && current !== document.body) {
          const tag = current.tagName.toLowerCase();
          const parent = current.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter(
              (c) => c.tagName === current!.tagName,
            );
            const idx = siblings.indexOf(current) + 1;
            parts.unshift(siblings.length > 1 ? `${tag}[${idx}]` : tag);
          } else {
            parts.unshift(tag);
          }
          current = parent;
        }
        return "/body/" + parts.join("/");
      }

      function isExemptByContext(el: Element, text: string): boolean {
        // Check exempt patterns against the full text
        const trimmed = text.trim();
        for (const regex of exemptRegexes) {
          if (regex.test(trimmed)) return true;
        }

        // User names: inside nav, header, avatar, or user-related elements
        const closestNav = el.closest(
          'nav, header, [class*="avatar"], [class*="user"], [class*="profile"], [class*="sidebar"]',
        );
        if (closestNav) {
          // Short Latin text in nav/header is likely a user name or toggle
          const latinOnly = trimmed.replace(/[^A-Za-z\s]/g, "").trim();
          if (latinOnly.length <= 30) return true;
        }

        // AI-generated content: meal/workout plan cards
        const closestPlan = el.closest(
          '[class*="meal"], [class*="workout"], [class*="plan"], [class*="recipe"], [class*="card"]',
        );
        if (closestPlan) return true;

        // Greeting with user name: Arabic text containing a Latin name
        const hasArabic = /[\u0600-\u06FF]/.test(trimmed);
        const latinWords = trimmed.match(/[A-Za-z]+/g) || [];
        if (hasArabic && latinWords.length <= 2) {
          // Mixed Arabic + 1-2 English words is likely a name interpolation
          const totalLatinChars = latinWords.join("").length;
          if (totalLatinChars <= 20) return true;
        }

        return false;
      }

      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = (node.textContent ?? "").trim();
        if (!text) continue;

        const el = node.parentElement!;

        // Check context-based exemptions first
        if (isExemptByContext(el, text)) continue;

        // Check for Latin characters
        let match: RegExpExecArray | null;
        latinRegex.lastIndex = 0;
        let hasViolation = false;
        while ((match = latinRegex.exec(text)) !== null) {
          const word = match[0];
          if (!whitelistLower.has(word.toLowerCase())) {
            hasViolation = true;
            break;
          }
        }

        if (hasViolation) {
          results.push({
            text: text.slice(0, 80),
            tagName: el.tagName.toLowerCase(),
            xpath: getXPath(el),
          });
        }
      }

      // Deduplicate by xpath
      const seen = new Set<string>();
      return results.filter((v) => {
        if (seen.has(v.xpath)) return false;
        seen.add(v.xpath);
        return true;
      });
    },
    {
      whitelist: WHITELIST_WORDS,
      exemptPatterns: EXEMPT_PATTERNS.map((r) => r.source),
    },
  );

  return {
    violations,
    isClean: violations.length === 0,
  };
}
