import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Provide a reliable localStorage mock (Node.js 22+ built-in conflicts with jsdom)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Auto-cleanup after each test
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorageMock.clear();
});

// Mock next-intl's useTranslations — returns the key itself
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock matchMedia (not implemented in jsdom)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
