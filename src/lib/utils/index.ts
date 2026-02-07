export { cn } from "./cn";

// Date utilities
export function formatDate(date: Date | string, locale: string = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatRelativeDate(
  date: Date | string,
  locale: string = "en"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - d.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return locale === "ar" ? "اليوم" : "Today";
  if (diffDays === 1) return locale === "ar" ? "أمس" : "Yesterday";
  if (diffDays < 7)
    return locale === "ar" ? `منذ ${diffDays} أيام` : `${diffDays} days ago`;

  return formatDate(d, locale);
}

// Number utilities
export function formatNumber(num: number, locale: string = "en"): string {
  return num.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");
}

// Calculate days until a date
export function daysUntil(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffTime = d.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Calculate days since a date
export function daysSince(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffTime = now.getTime() - d.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get current day index (0 = Sunday, 1 = Monday, etc.)
export function getCurrentDayIndex(): number {
  return new Date().getDay();
}

// Format weight with unit
export function formatWeight(weight: number, unit: "kg" | "lb" = "kg"): string {
  if (unit === "lb") {
    return `${(weight * 2.205).toFixed(1)} lb`;
  }
  return `${weight.toFixed(1)} kg`;
}

// Format height with unit
export function formatHeight(
  height: number,
  unit: "cm" | "ft" = "cm"
): string {
  if (unit === "ft") {
    const feet = Math.floor(height / 30.48);
    const inches = Math.round((height % 30.48) / 2.54);
    return `${feet}'${inches}"`;
  }
  return `${height.toFixed(0)} cm`;
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone (Egyptian format)
export function isValidEgyptianPhone(phone: string): boolean {
  // Egyptian phone: starts with 01 and has 11 digits total
  const phoneRegex = /^01[0125][0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s|-/g, ""));
}

// Generate initials from name
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

// Sleep utility for delays
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Get device info for bug reports
export function getDeviceInfo(): Record<string, string> {
  if (typeof window === "undefined") return {};

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenWidth: window.screen.width.toString(),
    screenHeight: window.screen.height.toString(),
    viewportWidth: window.innerWidth.toString(),
    viewportHeight: window.innerHeight.toString(),
  };
}
