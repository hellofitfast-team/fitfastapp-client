import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

interface AccessibilityViolation {
  id: string;
  impact: string | undefined;
  description: string;
  helpUrl: string;
  nodes: number;
}

interface AccessibilityResult {
  violations: AccessibilityViolation[];
  passes: number;
  isClean: boolean;
}

// Rules that are acceptable to skip in this project context
const DEFAULT_DISABLED_RULES = [
  "color-contrast", // Design-dependent, handled in design review
  "page-has-heading-one", // Not all pages need an h1 (e.g., modals)
];

/**
 * Run axe-core accessibility scan on the current page.
 * Returns structured violations for assertion.
 */
export async function checkAccessibility(
  page: Page,
  disabledRules?: string[],
): Promise<AccessibilityResult> {
  const rules = disabledRules ?? DEFAULT_DISABLED_RULES;

  const results = await new AxeBuilder({ page }).disableRules(rules).analyze();

  const violations: AccessibilityViolation[] = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact ?? undefined,
    description: v.description,
    helpUrl: v.helpUrl,
    nodes: v.nodes.length,
  }));

  return {
    violations,
    passes: results.passes.length,
    isClean: violations.length === 0,
  };
}

/**
 * Format violations into a readable string for test failure messages.
 */
export function formatViolations(violations: AccessibilityViolation[]): string {
  return violations
    .map(
      (v) =>
        `[${v.impact ?? "unknown"}] ${v.id}: ${v.description} (${v.nodes} elements) — ${v.helpUrl}`,
    )
    .join("\n");
}
