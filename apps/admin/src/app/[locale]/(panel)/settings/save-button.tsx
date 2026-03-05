"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Save, Check } from "lucide-react";

type SaveState = "idle" | "saving" | "saved" | "error";

interface SaveButtonProps {
  onSave: () => Promise<void>;
  label?: string;
  savingLabel?: string;
  savedLabel?: string;
  errorLabel?: string;
}

export function SaveButton({
  onSave,
  label,
  savingLabel,
  savedLabel,
  errorLabel,
}: SaveButtonProps) {
  const t = useTranslations("admin");
  const [state, setState] = useState<SaveState>("idle");

  const resolvedLabel = label ?? t("save");
  const resolvedSavingLabel = savingLabel ?? t("saving");
  const resolvedSavedLabel = savedLabel ?? t("saved");
  const resolvedErrorLabel = errorLabel ?? t("saveErrorRetry");

  const handleClick = async () => {
    if (state === "saving" || state === "saved") return;
    setState("saving");
    try {
      await onSave();
      setState("saved");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  };

  const isSuccess = state === "saved";
  const isError = state === "error";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "saving"}
      className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium shadow-md transition-all duration-300 disabled:opacity-70 ${
        isSuccess
          ? "bg-emerald-500 text-white shadow-emerald-200"
          : isError
            ? "bg-red-500 text-white shadow-red-200"
            : "bg-primary hover:bg-primary/90 shadow-primary/20 text-white"
      }`}
    >
      {isSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
      {state === "saving"
        ? resolvedSavingLabel
        : isSuccess
          ? resolvedSavedLabel
          : isError
            ? resolvedErrorLabel
            : resolvedLabel}
    </button>
  );
}
