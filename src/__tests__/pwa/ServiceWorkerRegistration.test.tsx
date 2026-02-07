import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

describe("ServiceWorkerRegistration", () => {
  const mockRegister = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockRegister.mockClear();
    Object.defineProperty(navigator, "serviceWorker", {
      writable: true,
      configurable: true,
      value: { register: mockRegister },
    });
  });

  it("renders nothing (returns null)", () => {
    const { container } = render(<ServiceWorkerRegistration />);
    expect(container.innerHTML).toBe("");
  });

  it("registers service worker with correct path and scope", () => {
    render(<ServiceWorkerRegistration />);

    expect(mockRegister).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    expect(mockRegister).toHaveBeenCalledTimes(1);
  });

  it("does not register when navigator.serviceWorker is absent", () => {
    // Temporarily remove serviceWorker from navigator
    const original = navigator.serviceWorker;
    Object.defineProperty(navigator, "serviceWorker", {
      writable: true,
      configurable: true,
      value: undefined,
    });

    const { container } = render(<ServiceWorkerRegistration />);
    expect(container.innerHTML).toBe("");
    // mockRegister should NOT have been called since we cleared in beforeEach
    // and the component skips registration when serviceWorker is absent
    expect(mockRegister).not.toHaveBeenCalled();

    // Restore
    Object.defineProperty(navigator, "serviceWorker", {
      writable: true,
      configurable: true,
      value: original,
    });
  });

  it("logs error on registration failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Registration failed");
    mockRegister.mockRejectedValueOnce(error);

    render(<ServiceWorkerRegistration />);

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("SW registration failed:", error);
    });
  });
});
