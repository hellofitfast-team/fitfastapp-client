"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useCheckInLock } from "@/hooks/use-check-in-lock";
import { useToast } from "@/hooks/use-toast";
import { Weight, Dumbbell, UtensilsCrossed, Camera, ClipboardCheck, Loader2 } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

import { CheckInLocked } from "./_components/check-in-locked";
import { StepProgress } from "./_components/step-progress";
import { WeightStep } from "./_components/weight-step";
import { FitnessStep } from "./_components/fitness-step";
import { DietaryStep } from "./_components/dietary-step";
import { PhotosStep } from "./_components/photos-step";
import { ReviewStep } from "./_components/review-step";
import { StepNavigation } from "./_components/step-navigation";

// Schema and type exported for sub-components to import
export const checkInSchema = z.object({
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

export type CheckInFormData = z.infer<typeof checkInSchema>;

const STEP_ICONS = [Weight, Dumbbell, UtensilsCrossed, Camera, ClipboardCheck];

export default function CheckInPage() {
  const t = useTranslations("checkIn");
  const router = useRouter();
  const { profile } = useAuth();
  const { toast } = useToast();

  const submitCheckIn = useMutation(api.checkIns.submitCheckIn);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const generateMealPlan = useAction(api.ai.generateMealPlan);
  const generateWorkoutPlan = useAction(api.ai.generateWorkoutPlan);

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

  // Use the extracted hook for lock status
  const { isLocked: isCheckInLocked, nextCheckInDate, daysUntilNextCheckIn, isLoadingLockStatus } = useCheckInLock();

  const methods = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema) as any,
    defaultValues: { energyLevel: 5, sleepQuality: 5, dietaryAdherence: 5 },
  });

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

  const uploadPhotosToStorage = async (): Promise<Id<"_storage">[]> => {
    if (uploadedPhotos.length === 0) return [];
    const uploadedIds: Id<"_storage">[] = [];

    for (const photo of uploadedPhotos) {
      const uploadUrl = await generateUploadUrl({});
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": photo.type },
        body: photo,
      });
      const { storageId } = await result.json();
      uploadedIds.push(storageId as Id<"_storage">);
    }
    return uploadedIds;
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
    return await methods.trigger(fields);
  };

  const handleNext = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < STEPS.length) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Prevent form submission on Enter key (only submit on explicit button click)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && currentStep < STEPS.length) {
      e.preventDefault();
    }
  };

  const onSubmit = async (data: CheckInFormData) => {
    if (!profile) {
      toast({ title: t("authRequired"), description: t("authRequiredDescription"), variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const progressPhotoIds = await uploadPhotosToStorage();
      const measurements = {
        chest: data.chest || null,
        waist: data.waist || null,
        hips: data.hips || null,
        arms: data.arms || null,
        thighs: data.thighs || null,
      };

      const checkInId = await submitCheckIn({
        weight: data.weight,
        measurements,
        workoutPerformance: data.workoutPerformance,
        energyLevel: data.energyLevel,
        sleepQuality: data.sleepQuality,
        dietaryAdherence: data.dietaryAdherence,
        newInjuries: data.newInjuries || undefined,
        progressPhotoIds: progressPhotoIds.length > 0 ? progressPhotoIds : undefined,
        notes: [data.dietNotes, data.notes].filter(Boolean).join("\n\n") || undefined,
      });

      // Generate new plans
      const language = profile.language || "en";
      const [mealResult, workoutResult] = await Promise.allSettled([
        generateMealPlan({ checkInId, language, planDuration: 14 }),
        generateWorkoutPlan({ checkInId, language, planDuration: 14 }),
      ]);

      if (mealResult.status === "rejected" || workoutResult.status === "rejected") {
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
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: "check-in-submission" },
      });
      toast({ title: t("submissionFailed"), description: error instanceof Error ? error.message : t("tryAgain"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-5 pb-8">
      {/* Submission Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl bg-card p-8 text-center shadow-xl mx-4">
            <Loader2 className="mx-auto h-10 w-10 animate-spin mb-4 text-primary" />
            <p className="font-bold text-lg">{t("submitting")}</p>
            <p className="text-sm text-muted-foreground mt-2">{t("newPlanGenerated")}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Check-in Locked Notice */}
      {isLoadingLockStatus ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground mb-4" />
          <p className="font-semibold text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : isCheckInLocked && nextCheckInDate ? (
        <CheckInLocked nextCheckInDate={nextCheckInDate} daysUntilNextCheckIn={daysUntilNextCheckIn} />
      ) : null}

      {/* Show form only if NOT locked */}
      {!isLoadingLockStatus && !isCheckInLocked && (
        <>
          {/* Progress Steps */}
          <StepProgress currentStep={currentStep} steps={STEPS} />

          {/* Form with FormProvider */}
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="space-y-5">
              {/* Step 1: Weight & Measurements */}
              {currentStep === 1 && <WeightStep />}

              {/* Step 2: Fitness Metrics */}
              {currentStep === 2 && <FitnessStep />}

              {/* Step 3: Dietary Adherence */}
              {currentStep === 3 && <DietaryStep />}

              {/* Step 4: Progress Photos */}
              {currentStep === 4 && (
                <PhotosStep
                  uploadedPhotos={uploadedPhotos}
                  onPhotoChange={handlePhotoChange}
                  onRemovePhoto={removePhoto}
                />
              )}

              {/* Step 5: Review & Submit */}
              {currentStep === 5 && <ReviewStep uploadedPhotosCount={uploadedPhotos.length} />}

              {/* Navigation Buttons */}
              <StepNavigation
                currentStep={currentStep}
                totalSteps={STEPS.length}
                isSubmitting={isSubmitting}
                onBack={handleBack}
                onNext={handleNext}
              />
            </form>
          </FormProvider>
        </>
      )}
    </div>
  );
}
