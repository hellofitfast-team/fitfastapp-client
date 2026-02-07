import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

const DISMISS_KEY = "fitfast-install-dismissed";

describe("InstallPrompt", () => {
  beforeEach(() => {
    window.localStorage.clear();

    // Default: not standalone, not iOS
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(navigator, "userAgent", {
      writable: true,
      configurable: true,
      value: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0",
    });
  });

  it("renders nothing by default (no prompt event, no iOS)", () => {
    const { container } = render(<InstallPrompt />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when app is in standalone mode", () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(<InstallPrompt />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing during cooldown period", () => {
    // Dismissed 1 day ago (within 7-day cooldown)
    window.localStorage.setItem(DISMISS_KEY, String(Date.now() - 1 * 24 * 60 * 60 * 1000));

    const { container } = render(<InstallPrompt />);
    expect(container.innerHTML).toBe("");
  });

  it("shows iOS instructions on iPhone", () => {
    Object.defineProperty(navigator, "userAgent", {
      writable: true,
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    });

    render(<InstallPrompt />);

    expect(screen.getByText("iosTitle")).toBeInTheDocument();
    expect(screen.getByText("iosInstructions")).toBeInTheDocument();
  });

  it("shows iOS instructions on iPad", () => {
    Object.defineProperty(navigator, "userAgent", {
      writable: true,
      configurable: true,
      value: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    });

    render(<InstallPrompt />);

    expect(screen.getByText("iosTitle")).toBeInTheDocument();
  });

  it("does not show install/dismiss buttons on iOS (share instructions only)", () => {
    Object.defineProperty(navigator, "userAgent", {
      writable: true,
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    });

    render(<InstallPrompt />);

    // iOS shows iosTitle but NOT the installButton
    expect(screen.getByText("iosTitle")).toBeInTheDocument();
    expect(screen.queryByText("installButton")).not.toBeInTheDocument();
  });

  it("shows install prompt when beforeinstallprompt fires", () => {
    render(<InstallPrompt />);

    const promptEvent = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(promptEvent, {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });

    act(() => {
      window.dispatchEvent(promptEvent);
    });

    expect(screen.getByText("installTitle")).toBeInTheDocument();
    expect(screen.getByText("installButton")).toBeInTheDocument();
    expect(screen.getByText("dismissButton")).toBeInTheDocument();
  });

  it("calls prompt() when install button is clicked", async () => {
    render(<InstallPrompt />);

    const promptFn = vi.fn().mockResolvedValue(undefined);
    const promptEvent = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(promptEvent, {
      prompt: promptFn,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });

    act(() => {
      window.dispatchEvent(promptEvent);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("installButton"));
    });

    expect(promptFn).toHaveBeenCalled();
  });

  it("dismiss button sets localStorage cooldown", () => {
    render(<InstallPrompt />);

    const promptEvent = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(promptEvent, {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });

    act(() => {
      window.dispatchEvent(promptEvent);
    });

    fireEvent.click(screen.getByText("dismissButton"));

    const stored = window.localStorage.getItem(DISMISS_KEY);
    expect(stored).toBeTruthy();
    expect(Number(stored)).toBeGreaterThan(0);
  });

  it("X button dismisses the prompt", () => {
    render(<InstallPrompt />);

    const promptEvent = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(promptEvent, {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });

    act(() => {
      window.dispatchEvent(promptEvent);
    });

    fireEvent.click(screen.getByLabelText("Dismiss"));

    expect(window.localStorage.getItem(DISMISS_KEY)).toBeTruthy();
    expect(screen.queryByText("installTitle")).not.toBeInTheDocument();
  });

  it("shows prompt again after cooldown expires", () => {
    // Dismissed 8 days ago (past 7-day cooldown)
    window.localStorage.setItem(DISMISS_KEY, String(Date.now() - 8 * 24 * 60 * 60 * 1000));

    Object.defineProperty(navigator, "userAgent", {
      writable: true,
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    });

    render(<InstallPrompt />);

    expect(screen.getByText("iosTitle")).toBeInTheDocument();
  });

  it("prevents default on beforeinstallprompt to defer it", () => {
    render(<InstallPrompt />);

    const promptEvent = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(promptEvent, {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });

    const preventSpy = vi.spyOn(promptEvent, "preventDefault");

    act(() => {
      window.dispatchEvent(promptEvent);
    });

    expect(preventSpy).toHaveBeenCalled();
  });
});
