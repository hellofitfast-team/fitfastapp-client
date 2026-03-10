"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useSwipeable } from "react-swipeable";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useCheckInLock } from "@/hooks/use-check-in-lock";
import { useToast } from "@/hooks/use-toast";
import { Weight, Dumbbell, UtensilsCrossed, Camera, ClipboardCheck, Loader2 } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from "@/lib/constants";

import { CheckInLocked } from "./_components/check-in-locked";
import { StepProgress } from "./_components/step-progress";
import { WeightStep } from "./_components/weight-step";
import { FitnessStep } from "./_components/fitness-step";
import { DietaryStep } from "./_components/dietary-step";
import { PhotosStep } from "./_components/photos-step";
import { ReviewStep } from "./_components/review-step";
import { StepNavigation } from "./_components/step-navigation";

// Schema factory for i18n validation messages
function createCheckInSchema(t: (key: string) => string) {
  return z.object({
    weight: z.coerce
      .number()
      .positive(t("validation.weightPositive"))
      .min(20, t("validation.weightTooLow"))
      .max(300, t("validation.weightTooHigh")),
    measurementMethod: z.enum(["manual", "inbody"]).default("manual"),
    chest: z.coerce.number().optional(),
    waist: z.coerce.number().optional(),
    hips: z.coerce.number().optional(),
    arms: z.coerce.number().optional(),
    thighs: z.coerce.number().optional(),
    workoutPerformance: z.string().min(10, t("validation.workoutPerformanceMin")),
    energyLevel: z.coerce
      .number()
      .min(1, t("validation.ratingRange"))
      .max(10, t("validation.ratingRange")),
    sleepQuality: z.coerce
      .number()
      .min(1, t("validation.ratingRange"))
      .max(10, t("validation.ratingRange")),
    dietaryAdherence: z.coerce
      .number()
      .min(1, t("validation.ratingRange"))
      .max(10, t("validation.ratingRange")),
    dietNotes: z.string().optional(),
    newInjuries: z.string().optional(),
    notes: z.string().optional(),
    cyclePhase: z
      .enum(["menstrual", "follicular", "ovulatory", "luteal", "not_tracking"])
      .optional(),
  });
}

export type CheckInFormData = z.infer<ReturnType<typeof createCheckInSchema>>;

export interface ProgressPhotos {
  front: File | null;
  back: File | null;
  side: File | null;
}

const STEP_ICONS = [Weight, Dumbbell, UtensilsCrossed, Camera, ClipboardCheck];

export default function CheckInPage() {
  const t = useTranslations("checkIn");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isRTL = locale === "ar";
  const router = useRouter();
  const { profile } = useAuth();
  const { toast } = useToast();
  const assessment = useQuery(api.assessments.getMyAssessment);
  const isFemale = assessment?.gender === "female";

  const checkInSchema = createCheckInSchema((key) => t(key));

  const startCheckInWorkflow = useMutation(api.checkIns.startCheckInWorkflow);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

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
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhotos>({
    front: null,
    back: null,
    side: null,
  });
  const [inBodyFile, setInBodyFile] = useState<File | null>(null);

  // Use the extracted hook for lock status
  const {
    isLocked: isCheckInLocked,
    nextCheckInDate,
    daysUntilNextCheckIn,
    frequencyDays,
    isLoadingLockStatus,
  } = useCheckInLock();

  const methods = useForm<CheckInFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver type inference gap with react-hook-form v7
    resolver: zodResolver(checkInSchema) as any,
    defaultValues: {
      energyLevel: 5,
      sleepQuality: 5,
      dietaryAdherence: 5,
      measurementMethod: "manual" as const,
    },
  });

  // Pre-fill weight from last check-in
  const latestCheckIn = useQuery(api.checkIns.getLatestCheckIn);

  useEffect(() => {
    if (latestCheckIn?.weight && !methods.getValues("weight")) {
      methods.setValue("weight", latestCheckIn.weight);
    }
  }, [latestCheckIn, methods]);

  const validateFile = (file: File): boolean => {
    const isImage = file.type.startsWith("image/");
    const isUnderSizeLimit = file.size <= MAX_UPLOAD_SIZE_BYTES;
    if (!isImage || !isUnderSizeLimit) {
      toast({
        title: t("invalidFile"),
        description: t("invalidFileDescription", { maxFileMB: MAX_UPLOAD_SIZE_MB }),
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleProgressPhoto = (position: keyof ProgressPhotos, file: File | null) => {
    if (file && !validateFile(file)) return;
    setProgressPhotos((prev) => ({ ...prev, [position]: file }));
  };

  const handleInBodyFile = (file: File | null) => {
    if (file && !validateFile(file)) return;
    setInBodyFile(file);
  };

  const uploadFileToStorage = async (
    file: File,
    purpose?: "progress_photo" | "ticket_screenshot",
  ): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl({ purpose });
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!result.ok) throw new Error(`Upload failed: ${result.status}`);
    const json = await result.json();
    if (!json.storageId) throw new Error("Upload succeeded but no storageId returned");
    return json.storageId as Id<"_storage">;
  };

  const validateStep = async (step: number): Promise<boolean> => {
    let fields: (keyof CheckInFormData)[] = [];
    switch (step) {
      case 1: {
        fields = ["weight"];
        const isValid = await methods.trigger(fields);
        if (!isValid) return false;

        const method = methods.getValues("measurementMethod");

        if (method === "inbody") {
          if (!inBodyFile) {
            toast({
              title: t("invalidFile"),
              description: t("inBodyRequired"),
              variant: "destructive",
            });
            return false;
          }
        } else {
          // Manual method: require at least one non-zero body measurement
          const { chest, waist, hips, arms, thighs } = methods.getValues();
          const hasAnyMeasurement = [chest, waist, hips, arms, thighs].some(
            (v) => v !== undefined && v > 0,
          );
          if (!hasAnyMeasurement) {
            toast({
              title: t("measurementsRequired"),
              description: t("measurementsRequiredDescription"),
              variant: "destructive",
            });
            return false;
          }
        }

        return true;
      }
      case 2:
        fields = ["workoutPerformance", "energyLevel", "sleepQuality"];
        break;
      case 3:
        fields = ["dietaryAdherence"];
        break;
      case 4:
        return true;
      default:
        return true;
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

  // Swipe support: In LTR, swipe left = next, swipe right = back
  // In RTL (Arabic), directions are inverted: swipe right = next, swipe left = back
  // Uses useLocale() for RTL detection (more reliable than document.dir)
  const handleSwipeNext = useCallback(async () => {
    if (currentStep === 4) return; // Disable swipe on photos step to avoid drag/drop conflicts
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < STEPS.length) setCurrentStep((s) => s + 1);
  }, [currentStep, STEPS.length]);

  const handleSwipeBack = useCallback(() => {
    if (currentStep === 4) return; // Disable swipe on photos step to avoid drag/drop conflicts
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (isRTL) {
        handleSwipeBack();
      } else {
        handleSwipeNext();
      }
    },
    onSwipedRight: () => {
      if (isRTL) {
        handleSwipeNext();
      } else {
        handleSwipeBack();
      }
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false,
    delta: 50,
  });

  // Prevent form submission on Enter key (only submit on explicit button click)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && currentStep < STEPS.length) {
      e.preventDefault();
    }
  };

  const onSubmit = async (data: CheckInFormData) => {
    if (!profile) {
      toast({
        title: t("authRequired"),
        description: t("authRequiredDescription"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload progress photos
      const photoUploads: {
        progressPhotoFront?: Id<"_storage">;
        progressPhotoBack?: Id<"_storage">;
        progressPhotoSide?: Id<"_storage">;
      } = {};
      if (progressPhotos.front) {
        photoUploads.progressPhotoFront = await uploadFileToStorage(
          progressPhotos.front,
          "progress_photo",
        );
      }
      if (progressPhotos.back) {
        photoUploads.progressPhotoBack = await uploadFileToStorage(
          progressPhotos.back,
          "progress_photo",
        );
      }
      if (progressPhotos.side) {
        photoUploads.progressPhotoSide = await uploadFileToStorage(
          progressPhotos.side,
          "progress_photo",
        );
      }

      // Upload InBody file if applicable
      let inBodyStorageId: Id<"_storage"> | undefined;
      if (data.measurementMethod === "inbody" && inBodyFile) {
        inBodyStorageId = await uploadFileToStorage(inBodyFile);
      }

      const measurements =
        data.measurementMethod === "manual"
          ? {
              chest: data.chest || undefined,
              waist: data.waist || undefined,
              hips: data.hips || undefined,
              arms: data.arms || undefined,
              thighs: data.thighs || undefined,
            }
          : undefined;

      const language = (locale === "ar" ? "ar" : "en") as "en" | "ar";

      await startCheckInWorkflow({
        weight: data.weight,
        measurementMethod: data.measurementMethod,
        measurements,
        inBodyStorageId,
        workoutPerformance: data.workoutPerformance,
        energyLevel: data.energyLevel,
        sleepQuality: data.sleepQuality,
        dietaryAdherence: data.dietaryAdherence,
        newInjuries: data.newInjuries || undefined,
        ...photoUploads,
        notes: [data.dietNotes, data.notes].filter(Boolean).join("\n\n") || undefined,
        cyclePhase: data.cyclePhase || undefined,
        language,
        planDuration: frequencyDays,
      });

      toast({
        title: t("checkInSuccess"),
        description: t("plansGenerateInBackground"),
      });

      router.replace("/");
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: "check-in-submission" },
      });
      toast({
        title: t("submissionFailed"),
        description: error instanceof Error ? error.message : t("tryAgain"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 pb-8">
      {/* Submission Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card mx-4 rounded-2xl p-8 text-center shadow-xl">
            <Loader2 className="text-primary mx-auto mb-4 h-10 w-10 animate-spin" />
            <p className="text-lg font-bold">{t("submitting")}</p>
            <p className="text-muted-foreground mt-2 text-sm">{t("plansGenerateInBackground")}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>

      {/* Check-in Locked Notice */}
      {isLoadingLockStatus ? (
        <div className="border-border bg-card rounded-xl border p-12 text-center">
          <Loader2 className="text-muted-foreground mx-auto mb-4 h-10 w-10 animate-spin" />
          <p className="text-muted-foreground text-sm font-semibold">{tCommon("loading")}</p>
        </div>
      ) : isCheckInLocked && nextCheckInDate ? (
        <CheckInLocked
          nextCheckInDate={nextCheckInDate}
          daysUntilNextCheckIn={daysUntilNextCheckIn}
          frequencyDays={frequencyDays}
        />
      ) : null}

      {/* Show form only if NOT locked */}
      {!isLoadingLockStatus && !isCheckInLocked && (
        <>
          {/* Progress Steps */}
          <StepProgress currentStep={currentStep} steps={STEPS} />

          {/* Screen reader announcement for current step */}
          <div className="sr-only" aria-live="polite" role="status">
            {t("stepOf", { current: currentStep, total: STEPS.length })}
          </div>

          {/* Form with FormProvider — swipe to navigate steps */}
          <FormProvider {...methods}>
            <form
              onSubmit={methods.handleSubmit(onSubmit)}
              onKeyDown={handleKeyDown}
              className="space-y-5"
            >
              {/* Swipeable step content */}
              <div {...swipeHandlers} className="touch-pan-y">
                <div key={currentStep} className="animate-fade-in">
                  {/* Step 1: Weight & Measurements */}
                  {currentStep === 1 && (
                    <WeightStep inBodyFile={inBodyFile} onInBodyFileChange={handleInBodyFile} />
                  )}

                  {/* Step 2: Fitness Metrics */}
                  {currentStep === 2 && <FitnessStep isFemale={isFemale} />}

                  {/* Step 3: Dietary Adherence */}
                  {currentStep === 3 && <DietaryStep />}

                  {/* Step 4: Progress Photos */}
                  {currentStep === 4 && (
                    <PhotosStep
                      progressPhotos={progressPhotos}
                      onPhotoChange={handleProgressPhoto}
                    />
                  )}

                  {/* Step 5: Review & Submit */}
                  {currentStep === 5 && (
                    <ReviewStep progressPhotos={progressPhotos} inBodyFile={inBodyFile} />
                  )}
                </div>
              </div>

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
