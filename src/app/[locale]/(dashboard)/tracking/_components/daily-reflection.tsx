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
    defaultValues: {
      reflection: defaultReflection || "",
    },
  });

  useEffect(() => {
    reset({ reflection: defaultReflection || "" });
  }, [defaultReflection, reset]);

  return (
    <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center bg-black">
          <BookOpen className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="font-black text-xl text-black tracking-tight">
            {t("dailyReflection").toUpperCase()}
          </h2>
          <p className="font-mono text-xs text-black/70">{t("howWasYourDay").toUpperCase()}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
        <textarea
          {...register("reflection")}
          placeholder={t("writeReflection").toUpperCase()}
          className="w-full min-h-[120px] p-4 border-4 border-black bg-neutral-50 font-mono text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors resize-none"
        />
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="h-12 px-6 bg-black text-cream font-black text-sm uppercase tracking-wide hover:bg-primary disabled:opacity-50 transition-colors"
        >
          {formState.isSubmitting ? t("saving").toUpperCase() : t("saveReflection").toUpperCase()}
        </button>
      </form>
    </div>
  );
}
