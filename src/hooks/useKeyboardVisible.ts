"use client";

import { useState, useEffect } from "react";

/**
 * Detects whether the virtual keyboard is open on mobile.
 * Uses the Visual Viewport API to compare viewport height against window height.
 * When the keyboard opens, the visual viewport shrinks significantly.
 */
export function useKeyboardVisible(): boolean {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      // Keyboard is open if visual viewport is < 75% of window height
      const isKeyboardOpen = vv.height < window.innerHeight * 0.75;
      setKeyboardVisible(isKeyboardOpen);
    };

    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  return keyboardVisible;
}
