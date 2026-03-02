"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { BookOpen } from "lucide-react";

interface ReflectionForm {
  reflection: string;
}

interface DailyReflectionProps {
  defaultReflection: string;
  onSubmit: (data: { reflection: string }) => void;
}

export function DailyReflection({ defaultReflection, onSubmit }: DailyReflectionProps) {
  const t = useTranslations("tracking");

  const { register, handleSubmit, reset, formState } = useForm<ReflectionForm>({
    defaultValues: { reflection: defaultReflection || "" },
  });

  useEffect(() => {
    reset({ reflection: defaultReflection || "" });
  }, [defaultReflection, reset]);

  return (
    <div
      className="border-border bg-card shadow-card animate-slide-up overflow-hidden rounded-xl border"
      style={{ animationDelay: "100ms" }}
    >
      <div className="border-border bg-routine/8 flex items-center gap-2 border-b p-4">
        <BookOpen className="text-routine h-4 w-4" />
        <div>
          <h2 className="text-sm font-semibold">{t("dailyReflection")}</h2>
          <p className="text-muted-foreground text-xs">{t("howWasYourDay")}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-4">
        <textarea
          {...register("reflection")}
          placeholder={t("writeReflection")}
          className="border-input placeholder:text-muted-foreground focus:ring-ring min-h-[100px] w-full resize-none rounded-lg border bg-neutral-50 p-3 text-sm transition-colors focus:ring-2 focus:outline-none"
        />
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="bg-primary hover:bg-primary/90 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50"
        >
          {formState.isSubmitting ? t("saving") : t("saveReflection")}
        </button>
      </form>
    </div>
  );
}
