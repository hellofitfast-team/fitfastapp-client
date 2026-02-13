"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, Upload, X, Weight, Dumbbell, UtensilsCrossed, Camera, ClipboardCheck, Loader2, Lock, Calendar } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

const checkInSchema = z.object({
  weight: z.coerce.number().positive("Weight must be positive").min(20, "Weight seems too low").max(300, "Weight seems too high"),
  chest: z.coerce.number().optional(),
  waist: z.coerce.number().optional(),
  hips: z.coerce.number().optional(),
  arms: z.coerce.number().optional(),
  thighs: z.coerce.number().optional(),
  workoutPerformance: z.string().min(10, "Please provide at least 10 characters about your workout performance"),
  energyLevel: z.coerce.number().min(1, "Energy level must be between 1-10").max(10, "Energy level must be between 1-10"),
  sleepQuality: z.coerce.number().min(1, "Sleep quality must be between 1-10").max(10, "Sleep quality must be between 1-10"),
  dietaryAdherence: z.coerce.number().min(1, "Dietary adherence must be between 1-10").max(10, "Dietary adherence must be between 1-10"),
  dietNotes: z.string().optional(),
  newInjuries: z.string().optional(),
  notes: z.string().optional(),
});

type CheckInFormData = z.infer<typeof checkInSchema>;

const STEP_ICONS = [Weight, Dumbbell, UtensilsCrossed, Camera, ClipboardCheck];

export default function CheckInPage() {
  const t = useTranslations("checkIn");
  const tUnits = useTranslations("units");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // Build steps with translations
  const STEPS = [
    { id: 1, name: t("steps.weight"), icon: STEP_ICONS[0] },
    { id: 2, name: t("steps.fitness"), icon: STEP_ICONS[1] },
    { id: 3, name: t("steps.dietary"), icon: STEP_ICONS[2] },
    { id: 4, name: t("steps.photos"), icon: STEP_ICONS[3] },
    { id: 5, name: t("steps.review"), icon: STEP_ICONS[4] },
  ];

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
  const [isCheckInLocked, setIsCheckInLocked] = useState(false);
  const [nextCheckInDate, setNextCheckInDate] = useState<Date | null>(null);
  const [daysUntilNextCheckIn, setDaysUntilNextCheckIn] = useState<number>(0);
  const [isLoadingLockStatus, setIsLoadingLockStatus] = useState(true);

  const { register, handleSubmit, formState: { errors }, watch, setValue, trigger } = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema) as any,
    defaultValues: { energyLevel: 5, sleepQuality: 5, dietaryAdherence: 5 },
  });

  const energyLevel = watch("energyLevel");
  const sleepQuality = watch("sleepQuality");
  const dietaryAdherence = watch("dietaryAdherence");

  // Check if check-in is locked based on last check-in date
  useEffect(() => {
    const checkLockStatus = async () => {
      if (!user) {
        setIsLoadingLockStatus(false);
        return;
      }

      try {
        const supabase = createClient();

        // Get the last check-in, frequency config, and latest plan for this user
        const [lastCheckInRes, freqRes, lastPlanRes] = await Promise.all([
          supabase
            .from("check_ins")
            .select("created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("system_config")
            .select("value")
            .eq("key", "check_in_frequency_days")
            .single<{ value: string }>(),
          supabase
            .from("meal_plans")
            .select("start_date")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (lastCheckInRes.error) throw lastCheckInRes.error;
        const lastCheckIn = lastCheckInRes.data;
        const lastPlan = lastPlanRes.data;

        // Determine baseline date: last check-in, or plan start if no check-ins yet
        let baselineDate: Date | null = null;

        if (lastCheckIn) {
          baselineDate = new Date((lastCheckIn as { created_at: string }).created_at);
        } else if (lastPlan) {
          baselineDate = new Date((lastPlan as { start_date: string }).start_date);
        }

        if (baselineDate) {
          const checkInFrequencyDays = parseInt(freqRes.data?.value || "14");

          const nextAllowedDate = new Date(baselineDate);
          nextAllowedDate.setDate(nextAllowedDate.getDate() + checkInFrequencyDays);

          const now = new Date();
          const isLocked = now < nextAllowedDate;

          setIsCheckInLocked(isLocked);
          setNextCheckInDate(nextAllowedDate);

          if (isLocked) {
            const daysRemaining = Math.ceil(
              (nextAllowedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            setDaysUntilNextCheckIn(daysRemaining);
          }
        }
      } catch (error) {
        Sentry.captureException(error, {
          tags: { feature: "check-in-lock-status" },
          extra: { userId: user.id },
        });
      } finally {
        setIsLoadingLockStatus(false);
      }
    };

    checkLockStatus();
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isUnder5MB = file.size <= 5 * 1024 * 1024;
      if (!isImage || !isUnder5MB) {
        toast({ title: t("invalidFile"), description: t("invalidFileDescription"), variant: "destructive" });
        return false;
      }
      return true;
    });
    setUploadedPhotos((prev) => [...prev, ...validFiles].slice(0, 4));
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotosToStorage = async (): Promise<string[]> => {
    if (uploadedPhotos.length === 0) return [];
    const supabase = createClient();
    const uploadedUrls: string[] = [];

    for (const photo of uploadedPhotos) {
      const fileName = `${user!.id}/${Date.now()}-${photo.name}`;
      const { data, error } = await supabase.storage.from("progress-photos").upload(fileName, photo);
      if (error) throw new Error(`Failed to upload ${photo.name}`);
      const { data: { publicUrl } } = supabase.storage.from("progress-photos").getPublicUrl(fileName);
      uploadedUrls.push(publicUrl);
    }
    return uploadedUrls;
  };

  const validateStep = async (step: number): Promise<boolean> => {
    let fields: (keyof CheckInFormData)[] = [];
    switch (step) {
      case 1: fields = ["weight"]; break;
      case 2: fields = ["workoutPerformance", "energyLevel", "sleepQuality"]; break;
      case 3: fields = ["dietaryAdherence"]; break;
      case 4: return true;
      default: return true;
    }
    return await trigger(fields);
  };

  const handleNext = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < STEPS.length) setCurrentStep(currentStep + 1);
  };

  // Prevent form submission on Enter key (only submit on explicit button click)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && currentStep < STEPS.length) {
      e.preventDefault();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const onSubmit = async (data: CheckInFormData) => {
    if (!user) {
      toast({ title: t("authRequired"), description: t("authRequiredDescription"), variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedPhotoUrls = await uploadPhotosToStorage();
      const supabase = createClient();
      const measurements = { chest: data.chest || null, waist: data.waist || null, hips: data.hips || null, arms: data.arms || null, thighs: data.thighs || null };

      const { data: checkInData, error: checkInError } = await supabase
        .from("check_ins")
        .insert({
          user_id: user.id,
          weight: data.weight,
          measurements,
          workout_performance: data.workoutPerformance,
          energy_level: data.energyLevel,
          sleep_quality: data.sleepQuality,
          dietary_adherence: data.dietaryAdherence,
          new_injuries: data.newInjuries || null,
          progress_photo_urls: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : null,
          notes: [data.dietNotes, data.notes].filter(Boolean).join("\n\n") || null,
        } as any)
        .select()
        .single();

      if (checkInError) throw checkInError;

      // RELY-05: user sees warning on failure
      const [mealResponse, workoutResponse] = await Promise.all([
        fetch("/api/plans/meal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkInId: (checkInData as any).id }),
        }).catch((err) => {
          Sentry.captureException(err, {
            tags: { feature: "plan-generation", planType: "meal" },
            extra: { userId: user.id, checkInId: (checkInData as any).id },
          });
          return { ok: false } as Response;
        }),
        fetch("/api/plans/workout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkInId: (checkInData as any).id }),
        }).catch((err) => {
          Sentry.captureException(err, {
            tags: { feature: "plan-generation", planType: "workout" },
            extra: { userId: user.id, checkInId: (checkInData as any).id },
          });
          return { ok: false } as Response;
        }),
      ]);

      if (!mealResponse.ok || !workoutResponse.ok) {
        // RELY-05: Show clear warning to user that plans failed
        toast({
          title: t("checkInSuccess"),
          description: t("planGenerationWarning"),
        });
      } else {
        toast({
          title: t("checkInSuccess"),
          description: t("newPlanGenerated"),
        });
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: "check-in-submission" },
        extra: { userId: user.id },
      });
      toast({ title: t("submissionFailed"), description: error instanceof Error ? error.message : t("tryAgain"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      {/* Submission Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="border-4 border-black bg-cream p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <Loader2 className="mx-auto h-12 w-12 animate-spin mb-4 text-primary" />
            <p className="font-black text-xl">{t("submitting").toUpperCase()}</p>
            <p className="font-bold text-sm text-neutral-500 mt-2">
              {t("newPlanGenerated").toUpperCase()}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-4 border-black bg-black p-6">
        <h1 className="text-3xl font-black tracking-tight text-cream">{t("title").toUpperCase()}</h1>
        <p className="mt-2 font-mono text-xs tracking-[0.2em] text-primary">{t("subtitle").toUpperCase()}</p>
      </div>

      {/* Check-in Locked Notice */}
      {isLoadingLockStatus ? (
        <div className="border-4 border-black bg-cream p-12 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-neutral-400 mb-4" />
          <p className="font-black text-lg uppercase">Loading...</p>
        </div>
      ) : isCheckInLocked && nextCheckInDate ? (
        <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-black">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-black text-xl text-white tracking-tight">
              {t("checkInLocked", { default: "CHECK-IN LOCKED" }).toUpperCase()}
            </h2>
          </div>
          <div className="p-12 text-center">
            <div className="inline-flex h-20 w-20 items-center justify-center bg-primary mb-6">
              <Calendar className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-black tracking-tight">
              {t("nextCheckInAvailable", { default: "NEXT CHECK-IN AVAILABLE" }).toUpperCase()}
            </h3>
            <p className="mt-4 text-5xl font-black text-primary">
              {daysUntilNextCheckIn} {t("days", { default: "DAYS" }).toUpperCase()}
            </p>
            <p className="mt-4 font-mono text-sm text-neutral-500">
              {nextCheckInDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }).toUpperCase()}
            </p>
            <div className="mt-8 p-6 border-4 border-dashed border-black bg-neutral-50">
              <p className="font-bold text-base">
                {t("lockReason", { default: "Check-ins are scheduled every 14 days to ensure optimal progress tracking and AI plan generation. Use this time to follow your current meal and workout plans." }).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Show form only if NOT locked */}
      {!isLoadingLockStatus && !isCheckInLocked && (
        <>

      {/* Progress Steps */}
      <div className="border-4 border-black bg-cream">
        <div className="flex">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex-1 p-3 border-e-4 last:border-e-0 border-black text-center transition-colors ${
                currentStep > step.id
                  ? "bg-success-500"
                  : currentStep === step.id
                  ? "bg-primary"
                  : "bg-neutral-100"
              }`}
            >
              <div className={`h-8 w-8 mx-auto flex items-center justify-center border-4 border-black ${
                currentStep > step.id ? "bg-black text-success-500" : currentStep === step.id ? "bg-black text-primary" : "bg-white text-neutral-400"
              }`}>
                {currentStep > step.id ? <Check className="h-4 w-4" /> : <span className="text-xs font-black">{step.id}</span>}
              </div>
              <p className={`mt-2 font-bold text-[10px] sm:text-xs hidden sm:block ${
                currentStep > step.id ? "text-black" : currentStep === step.id ? "text-white" : "text-black"
              }`}>{step.name.toUpperCase()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="space-y-6">
        {/* Step 1: Weight & Measurements */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-black"><Weight className="h-5 w-5 text-primary" /></div>
                <h2 className="font-black text-xl text-white">{t("weight").toUpperCase()}</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="75.5"
                    className="w-32 h-14 px-4 border-4 border-black bg-cream font-black text-2xl text-center focus:outline-none focus:bg-white transition-colors"
                    {...register("weight")}
                  />
                  <span className="font-black text-xl">{tUnits("kg").toUpperCase()}</span>
                </div>
                {errors.weight && <p className="mt-2 font-mono text-xs text-error-500">{errors.weight.message}</p>}
              </div>
            </div>

            <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="border-b-4 border-black bg-neutral-100 p-4">
                <h2 className="font-black text-lg">{t("measurements").toUpperCase()} ({t("optional").toUpperCase()})</h2>
                <p className="font-bold text-sm text-neutral-500">{t("allIn").toUpperCase()} {tUnits("cm").toUpperCase()}</p>
              </div>
              <div className="p-6 grid gap-4 sm:grid-cols-2">
                {[
                  { key: "chest" as const, label: t("chest") },
                  { key: "waist" as const, label: t("waist") },
                  { key: "hips" as const, label: t("hips") },
                  { key: "arms" as const, label: t("arms") },
                  { key: "thighs" as const, label: t("thighs") },
                ].map((m) => (
                  <div key={m.key}>
                    <label className="block font-bold text-xs uppercase mb-2">{m.label}</label>
                    <input type="number" step="0.5" placeholder="0" className="w-full h-12 px-4 border-4 border-black bg-cream font-mono text-sm focus:outline-none focus:bg-white" {...register(m.key)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Fitness Metrics */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-black"><Dumbbell className="h-5 w-5 text-primary" /></div>
                <h2 className="font-black text-xl text-black">{t("performance").toUpperCase()}</h2>
              </div>
              <div className="p-6">
                <textarea
                  placeholder={t("placeholders.performance").toUpperCase()}
                  className="w-full min-h-[120px] p-4 border-4 border-black bg-cream font-bold text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white resize-none"
                  {...register("workoutPerformance")}
                />
                {errors.workoutPerformance && <p className="mt-2 font-bold text-sm text-error-500">{errors.workoutPerformance.message}</p>}
              </div>
            </div>

            <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="border-b-4 border-black bg-black p-4">
                <h2 className="font-black text-lg text-cream">{t("wellbeingMetrics").toUpperCase()}</h2>
              </div>
              <div className="p-6 space-y-6">
                {[
                  { key: "energyLevel" as const, label: t("energy"), value: energyLevel },
                  { key: "sleepQuality" as const, label: t("sleep"), value: sleepQuality },
                ].map((metric) => (
                  <div key={metric.key}>
                    <div className="flex items-center justify-between mb-3">
                      <label className="font-bold text-sm uppercase">{metric.label}</label>
                      <span className="text-2xl font-black text-primary">{metric.value}/10</span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setValue(metric.key, num)}
                          className={`flex-1 h-12 border-4 border-black font-black text-xs transition-colors ${
                            metric.value >= num ? "bg-primary text-white" : "bg-neutral-100 hover:bg-neutral-200"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Dietary Adherence */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-black"><UtensilsCrossed className="h-5 w-5 text-primary" /></div>
                <h2 className="font-black text-xl text-white">{t("adherence").toUpperCase()}</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="font-bold text-sm uppercase">{t("adherenceRating")}</label>
                  <span className="text-2xl font-black text-primary">{dietaryAdherence}/10</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setValue("dietaryAdherence", num)}
                      className={`flex-1 h-12 border-4 border-black font-black text-xs transition-colors ${
                        dietaryAdherence >= num ? "bg-primary text-white" : "bg-neutral-100 hover:bg-neutral-200"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder={t("placeholders.dietNotes").toUpperCase()}
                  className="w-full min-h-[100px] p-4 border-4 border-black bg-neutral-50 font-bold text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white resize-none"
                  {...register("dietNotes")}
                />
              </div>
            </div>

            <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="border-b-4 border-black bg-neutral-100 p-4">
                <h2 className="font-black text-lg">{t("injuries").toUpperCase()} ({t("optional").toUpperCase()})</h2>
              </div>
              <div className="p-6">
                <textarea
                  placeholder={t("placeholders.injuries").toUpperCase()}
                  className="w-full min-h-[100px] p-4 border-4 border-black bg-neutral-50 font-bold text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white resize-none"
                  {...register("newInjuries")}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Progress Photos */}
        {currentStep === 4 && (
          <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="border-b-4 border-black bg-primary p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center bg-black"><Camera className="h-5 w-5 text-primary" /></div>
              <div>
                <h2 className="font-black text-xl text-black">{t("photos").toUpperCase()}</h2>
                <p className="font-bold text-sm text-black/70">{t("maxPhotos").toUpperCase()}</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <input type="file" id="photo-upload" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" disabled={uploadedPhotos.length >= 4} />

              {uploadedPhotos.length === 0 ? (
                <label htmlFor="photo-upload" className="flex flex-col items-center justify-center h-48 border-4 border-dashed border-black bg-neutral-100 cursor-pointer hover:bg-neutral-200 transition-colors">
                  <Upload className="h-10 w-10 text-neutral-400 mb-3" />
                  <p className="font-black">{t("uploadPhotos").toUpperCase()}</p>
                  <p className="font-bold text-sm text-neutral-500 mt-1">{t("fileTypes").toUpperCase()}</p>
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {uploadedPhotos.map((photo, index) => (
                      <div key={index} className="relative border-4 border-black aspect-square overflow-hidden">
                        <img src={URL.createObjectURL(photo)} alt={`Progress photo ${index + 1}`} className="h-full w-full object-cover" />
                        <button type="button" onClick={() => removePhoto(index)} className="absolute top-2 end-2 h-12 w-12 bg-error-500 border-2 border-black flex items-center justify-center text-white hover:bg-black transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {uploadedPhotos.length < 4 && (
                    <label htmlFor="photo-upload" className="flex items-center justify-center h-14 border-4 border-dashed border-black bg-neutral-100 cursor-pointer hover:bg-neutral-200 transition-colors">
                      <Upload className="h-5 w-5 me-2 text-neutral-400" />
                      <span className="font-bold text-sm uppercase">{t("addMorePhotos")}</span>
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="border-b-4 border-black bg-black p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-primary"><ClipboardCheck className="h-5 w-5 text-white" /></div>
                <h2 className="font-black text-xl text-cream">{t("review").toUpperCase()}</h2>
              </div>
              <div className="divide-y-4 divide-black">
                {[
                  { label: t("weight"), value: `${watch("weight")} ${tUnits("kg").toUpperCase()}` },
                  { label: t("energy"), value: `${watch("energyLevel")}/10` },
                  { label: t("sleep"), value: `${watch("sleepQuality")}/10` },
                  { label: t("adherence"), value: `${watch("dietaryAdherence")}/10` },
                  { label: t("photos"), value: `${uploadedPhotos.length} ${t("uploaded").toUpperCase()}` },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between p-4">
                    <span className="font-bold text-sm text-neutral-500">{item.label.toUpperCase()}</span>
                    <span className="font-black">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-4 border-black bg-cream shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="border-b-4 border-black bg-neutral-100 p-4">
                <h2 className="font-black text-lg">{t("additionalNotes").toUpperCase()} ({t("optional").toUpperCase()})</h2>
              </div>
              <div className="p-6">
                <textarea
                  placeholder={t("placeholders.notes").toUpperCase()}
                  className="w-full min-h-[100px] p-4 border-4 border-black bg-neutral-50 font-bold text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white resize-none"
                  {...register("notes")}
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            className="h-14 px-6 border-4 border-black bg-cream font-black text-sm uppercase tracking-wide hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {tCommon("back").toUpperCase()}
          </button>

          {currentStep < STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="h-14 px-6 bg-black text-cream font-black text-sm uppercase tracking-wide hover:bg-primary disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {tCommon("next").toUpperCase()}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-14 px-8 bg-primary text-white font-black text-sm uppercase tracking-wide hover:bg-primary-dark hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("submitting").toUpperCase()}
                </>
              ) : (
                <>
                  {t("submitCheckIn").toUpperCase()}
                  <Check className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </form>
      </>
      )}
    </div>
  );
}
