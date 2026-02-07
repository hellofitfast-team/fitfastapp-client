import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted() so the mock fn is available when vi.mock() is hoisted
const { mockInit } = vi.hoisted(() => ({
  mockInit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("react-onesignal", () => ({
  default: { init: mockInit },
}));

import { OneSignalProvider } from "@/components/pwa/OneSignalProvider";

describe("OneSignalProvider", () => {
  beforeEach(() => {
    mockInit.mockClear();
    delete process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  });

  it("renders nothing (returns null)", () => {
    const { container } = render(<OneSignalProvider />);
    expect(container.innerHTML).toBe("");
  });

  it("does not initialize when NEXT_PUBLIC_ONESIGNAL_APP_ID is not set", () => {
    render(<OneSignalProvider />);
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("initializes OneSignal with correct config when appId is set", () => {
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID = "test-app-id-123";
    (process.env as Record<string, string>).NODE_ENV = "development";

    render(<OneSignalProvider />);

    expect(mockInit).toHaveBeenCalledWith({
      appId: "test-app-id-123",
      serviceWorkerParam: { scope: "/" },
      serviceWorkerPath: "/sw.js",
      allowLocalhostAsSecureOrigin: true,
    });
  });

  it("sets allowLocalhostAsSecureOrigin false in production", () => {
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID = "test-app-id-123";
    (process.env as Record<string, string>).NODE_ENV = "production";

    render(<OneSignalProvider />);

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({ allowLocalhostAsSecureOrigin: false })
    );

    (process.env as Record<string, string>).NODE_ENV = "test";
  });

  it("logs error when OneSignal init fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Init failed");
    mockInit.mockRejectedValueOnce(error);
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID = "test-app-id-123";

    render(<OneSignalProvider />);

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("OneSignal init failed:", error);
    });
  });
});
