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
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-border bg-[#8B5CF6]/8">
        <BookOpen className="h-4 w-4 text-[#8B5CF6]" />
        <div>
          <h2 className="font-semibold text-sm">{t("dailyReflection")}</h2>
          <p className="text-xs text-muted-foreground">{t("howWasYourDay")}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-3">
        <textarea
          {...register("reflection")}
          placeholder={t("writeReflection")}
          className="w-full min-h-[100px] p-3 rounded-lg border border-input bg-neutral-50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
        />
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-[0.97]"
        >
          {formState.isSubmitting ? t("saving") : t("saveReflection")}
        </button>
      </form>
    </div>
  );
}
