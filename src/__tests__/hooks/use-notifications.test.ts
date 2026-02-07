import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mock for react-onesignal
const { mockOneSignal } = vi.hoisted(() => ({
  mockOneSignal: {
    User: {
      PushSubscription: { optedIn: false as boolean | null },
    },
    Notifications: {
      requestPermission: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock("react-onesignal", () => ({
  default: mockOneSignal,
}));

import { useNotifications } from "@/hooks/use-notifications";

function setupNotificationMock(perm: NotificationPermission = "default") {
  const requestPermission = vi.fn().mockResolvedValue("granted");
  Object.defineProperty(window, "Notification", {
    writable: true,
    configurable: true,
    value: { permission: perm, requestPermission },
  });
  return requestPermission;
}

function setupServiceWorker() {
  Object.defineProperty(navigator, "serviceWorker", {
    writable: true,
    configurable: true,
    value: { register: vi.fn() },
  });
}

describe("useNotifications", () => {
  beforeEach(() => {
    setupNotificationMock("default");
    setupServiceWorker();
    mockOneSignal.User.PushSubscription.optedIn = false;
    mockOneSignal.Notifications.requestPermission.mockClear();
  });

  it("detects when notifications are supported", async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isSupported).toBe(true);
  });

  it("detects when notifications are not supported", async () => {
    Object.defineProperty(window, "Notification", {
      writable: true,
      configurable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isSupported).toBe(false);
  });

  it("reads initial permission state", async () => {
    setupNotificationMock("granted");

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.permission).toBe("granted");
  });

  it("checks OneSignal subscription state on mount", async () => {
    mockOneSignal.User.PushSubscription.optedIn = true;

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isSubscribed).toBe(true);
  });

  it("handles null optedIn gracefully", async () => {
    mockOneSignal.User.PushSubscription.optedIn = null;

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isSubscribed).toBe(false);
  });

  it("requestPermission does nothing when not supported", async () => {
    Object.defineProperty(window, "Notification", {
      writable: true,
      configurable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(result.current.isSupported).toBe(false);
    expect(mockOneSignal.Notifications.requestPermission).not.toHaveBeenCalled();
  });

  it("starts in loading state", () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.loading).toBe(true);
  });

  it("returns default permission initially", () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.permission).toBe("default");
  });
});
