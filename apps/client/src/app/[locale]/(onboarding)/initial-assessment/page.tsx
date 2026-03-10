"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useSwipeable } from "react-swipeable";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@fitfast/ui/button";
import { AssessmentProgress } from "./_components/assessment-progress";
import { GoalsSection } from "./_components/goals-section";
import { BasicInfoSection } from "./_components/basic-info-section";
import { ScheduleSection } from "./_components/schedule-section";
import { getDayLimits } from "./_components/constants";
import { DietarySection } from "./_components/dietary-section";
import { MedicalSection } from "./_components/medical-section";
import { MeasurementsSection } from "./_components/measurements-section";

const TOTAL_STEPS = 6;

export default function InitialAssessmentPage() {
  const t = useTranslations("onboarding.assessment");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const submitAssessment = useMutation(api.assessments.submitAssessment);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  // Fetch admin-configured cycle duration for initial plan generation
  const frequencyConfig = useQuery(api.systemConfig.getConfig, { key: "check_in_frequency_days" });
  const rawDuration =
    typeof frequencyConfig?.value === "number"
      ? frequencyConfig.value
      : Number(frequencyConfig?.value) || 10;
  const planDuration = rawDuration > 0 ? rawDuration : 10;

  // Step labels from translations
  const STEP_LABELS = [
    t("steps.goals"),
    t("steps.bodyInfo"),
    t("steps.schedule"),
    t("steps.diet"),
    t("steps.measurements"),
    t("steps.medical"),
  ];

  // Form state
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [secondaryFocuses, setSecondaryFocuses] = useState<string[]>([]);
  const [currentWeight, setCurrentWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [sessionDuration, setSessionDuration] = useState("");
  const [trainingTime, setTrainingTime] = useState("");
  const [mealsPerDay, setMealsPerDay] = useState("");
  const [selectedFoodPrefs, setSelectedFoodPrefs] = useState<string[]>([]);
  const [foodPrefsOther, setFoodPrefsOther] = useState("");
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [allergiesOther, setAllergiesOther] = useState("");
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
  const [restrictionsOther, setRestrictionsOther] = useState("");
  const [equipment, setEquipment] = useState("");
  const [equipmentOther, setEquipmentOther] = useState("");
  const [measurementMethod, setMeasurementMethod] = useState<"manual" | "inbody">("manual");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [arms, setArms] = useState("");
  const [thighs, setThighs] = useState("");
  const [inBodyFile, setInBodyFile] = useState<File | null>(null);
  const [medicalNotes, setMedicalNotes] = useState("");

  const getFinalValues = (selected: string[], otherValue: string) => {
    const values = selected.filter((s) => s !== "other" && s !== "none");
    if (selected.includes("other") && otherValue.trim()) {
      values.push(otherValue.trim());
    }
    return values;
  };

  // Per-step validation
  const validateStep = (step: number): string | null => {
    switch (step) {
      case 1: {
        if (!primaryGoal) return tErrors("goalRequired");
        return null;
      }
      case 2: {
        if (!currentWeight || !height) return tErrors("weightHeightRequired");
        if (!age || !gender) return tErrors("ageGenderRequired");
        // Range validation for anthropometric data
        const w = parseFloat(String(currentWeight));
        const h = parseFloat(String(height));
        const a = parseFloat(String(age));
        if (isNaN(w) || w < 30 || w > 300) return tErrors("weightOutOfRange");
        if (isNaN(h) || h < 100 || h > 250) return tErrors("heightOutOfRange");
        if (isNaN(a) || a < 13 || a > 120) return tErrors("ageOutOfRange");
        if (!experienceLevel) return tErrors("experienceLevelRequired");
        if (!equipment) return tErrors("equipmentRequired");
        if (equipment === "other" && !equipmentOther.trim()) return tErrors("equipmentSpecify");
        return null;
      }
      case 3: {
        const limits = getDayLimits(primaryGoal, experienceLevel);
        if (selectedDays.length < limits.min) return tErrors("workoutDaysMin", { min: limits.min });
        if (!sessionDuration) return tErrors("sessionDurationRequired");
        return null;
      }
      case 4:
        return null; // Dietary is optional
      case 5: {
        // Measurements: InBody requires file, manual is optional
        if (measurementMethod === "inbody" && !inBodyFile) {
          return tErrors("inBodyFileRequired");
        }
        return null;
      }
      case 6:
        return null; // Medical is optional
      default:
        return null;
    }
  };

  // Guard: block form submission for a short window after advancing to the last step.
  // When clicking "Next" on step 4, React re-renders the Submit button in the same
  // DOM position as the old Next button, and the browser's click event can propagate
  // to the new submit button, triggering an unintended form submission.
  const justAdvancedToFinal = useRef(false);

  // Step navigation
  const handleNext = () => {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    if (currentStep < TOTAL_STEPS) {
      if (currentStep + 1 === TOTAL_STEPS) {
        justAdvancedToFinal.current = true;
        setTimeout(() => {
          justAdvancedToFinal.current = false;
        }, 300);
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Swipe handlers with RTL support (use locale, not document.dir which may not be set yet)
  const isRtl = locale === "ar";
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (isRtl) handleBack();
      else handleNext();
    },
    onSwipedRight: () => {
      if (isRtl) handleNext();
      else handleBack();
    },
    delta: 50,
    preventScrollOnSwipe: false,
    trackTouch: true,
    trackMouse: false,
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: only allow submission from the final step.
    // Prevents implicit form submission (e.g. pressing Enter in a text input)
    // from triggering submit on earlier steps where optional validation passes.
    if (currentStep < TOTAL_STEPS) {
      return;
    }

    // Guard: block submission that fires from click propagation when the
    // Next button on step 4 is replaced by the Submit button in the same render.
    if (justAdvancedToFinal.current) {
      return;
    }

    // Final validation for the last step (all steps should already be validated)
    for (let step = 1; step <= TOTAL_STEPS; step++) {
      const validationError = validateStep(step);
      if (validationError) {
        setCurrentStep(step);
        setError(validationError);
        return;
      }
    }

    if (!profile) {
      setError(tErrors("signInRequired"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const finalGoals = [primaryGoal, ...secondaryFocuses];
      const finalFoodPrefs = getFinalValues(selectedFoodPrefs, foodPrefsOther);
      const finalAllergies = getFinalValues(selectedAllergies, allergiesOther);
      const finalRestrictions = getFinalValues(selectedRestrictions, restrictionsOther);
      const finalEquipment = equipment === "other" ? equipmentOther.trim() : equipment;

      const language = (locale === "ar" ? "ar" : "en") as "en" | "ar";

      // Upload InBody file to storage if present
      let inBodyStorageId: string | undefined;
      if (measurementMethod === "inbody" && inBodyFile) {
        const uploadUrl = await generateUploadUrl({});
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": inBodyFile.type },
          body: inBodyFile,
        });
        if (!result.ok) throw new Error("Failed to upload InBody file");
        const { storageId } = await result.json();
        inBodyStorageId = storageId;
      }

      // Build measurements from manual input
      const measurements =
        measurementMethod === "manual"
          ? {
              chest: chest ? parseFloat(chest) : undefined,
              waist: waist ? parseFloat(waist) : undefined,
              hips: hips ? parseFloat(hips) : undefined,
              arms: arms ? parseFloat(arms) : undefined,
              thighs: thighs ? parseFloat(thighs) : undefined,
            }
          : {};

      await submitAssessment({
        goals: finalGoals.join(", "),
        currentWeight: parseFloat(currentWeight),
        height: parseFloat(height),
        age: parseInt(age),
        gender: gender as "male" | "female",
        activityLevel: activityLevel
          ? (activityLevel as "sedentary" | "lightly_active" | "moderately_active" | "very_active")
          : undefined,
        experienceLevel: experienceLevel as "beginner" | "intermediate" | "advanced",
        scheduleAvailability: {
          days: selectedDays,
          sessionDuration: sessionDuration ? parseInt(sessionDuration) : undefined,
          preferredTime: trainingTime || undefined,
        },
        foodPreferences: finalFoodPrefs.length > 0 ? finalFoodPrefs : undefined,
        allergies: finalAllergies.length > 0 ? finalAllergies : undefined,
        dietaryRestrictions: finalRestrictions.length > 0 ? finalRestrictions : undefined,
        medicalConditions: medicalNotes ? [medicalNotes] : undefined,
        exerciseHistory: finalEquipment,
        measurements,
        measurementMethod,
        inBodyStorageId: inBodyStorageId as any,
        lifestyleHabits: {
          equipment: finalEquipment,
          mealsPerDay: mealsPerDay ? parseInt(mealsPerDay) : undefined,
        },
        // Schedule server-side plan generation (survives client navigation)
        generatePlans: { language, planDuration },
      });

      // Update profile status to active
      try {
        await updateProfile({});
      } catch (updateError) {
        console.error("Error updating profile:", updateError); // Sentry captures this
      }

      // Navigate immediately — plans generate server-side via scheduler
      router.push("/");
    } catch (err) {
      console.error("Assessment error:", err); // Sentry captures this
      setError(err instanceof Error ? err.message : tErrors("unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-3xl space-y-6 pb-12">
      {/* Full-screen generating overlay */}
      {isLoading && (
        <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <div className="relative">
              <div className="border-primary/20 h-16 w-16 rounded-full border-4" />
              <div className="border-primary absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
            <div className="space-y-1.5">
              <p className="text-lg font-semibold">{t("submitting")}</p>
              <p className="text-muted-foreground max-w-xs text-sm">{t("generatingDescription")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t("subtitle")}</p>
      </div>

      {/* Progress Bar */}
      <AssessmentProgress
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        stepLabels={STEP_LABELS}
      />

      <form onSubmit={onSubmit} className="space-y-6">
        {error && (
          <div className="border-error-500/30 bg-error-500/10 rounded-lg border p-4">
            <p className="text-error-500 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Step content with swipe */}
        <div {...swipeHandlers} className="touch-pan-y">
          {currentStep === 1 && (
            <div style={{ animation: "fadeIn 0.2s ease-out" }}>
              <GoalsSection
                primaryGoal={primaryGoal}
                setPrimaryGoal={setPrimaryGoal}
                secondaryFocuses={secondaryFocuses}
                setSecondaryFocuses={setSecondaryFocuses}
                isLoading={isLoading}
              />
            </div>
          )}
          {currentStep === 2 && (
            <div style={{ animation: "fadeIn 0.2s ease-out" }}>
              <BasicInfoSection
                currentWeight={currentWeight}
                setCurrentWeight={setCurrentWeight}
                height={height}
                setHeight={setHeight}
                age={age}
                setAge={setAge}
                gender={gender}
                setGender={setGender}
                activityLevel={activityLevel}
                setActivityLevel={setActivityLevel}
                experienceLevel={experienceLevel}
                setExperienceLevel={setExperienceLevel}
                equipment={equipment}
                setEquipment={setEquipment}
                equipmentOther={equipmentOther}
                setEquipmentOther={setEquipmentOther}
                isLoading={isLoading}
              />
            </div>
          )}
          {currentStep === 3 && (
            <div style={{ animation: "fadeIn 0.2s ease-out" }}>
              <ScheduleSection
                selectedDays={selectedDays}
                setSelectedDays={setSelectedDays}
                sessionDuration={sessionDuration}
                setSessionDuration={setSessionDuration}
                trainingTime={trainingTime}
                setTrainingTime={setTrainingTime}
                primaryGoal={primaryGoal}
                experienceLevel={experienceLevel}
                isLoading={isLoading}
              />
            </div>
          )}
          {currentStep === 4 && (
            <div style={{ animation: "fadeIn 0.2s ease-out" }}>
              <DietarySection
                selectedFoodPrefs={selectedFoodPrefs}
                setSelectedFoodPrefs={setSelectedFoodPrefs}
                foodPrefsOther={foodPrefsOther}
                setFoodPrefsOther={setFoodPrefsOther}
                mealsPerDay={mealsPerDay}
                setMealsPerDay={setMealsPerDay}
                selectedAllergies={selectedAllergies}
                setSelectedAllergies={setSelectedAllergies}
                allergiesOther={allergiesOther}
                setAllergiesOther={setAllergiesOther}
                selectedRestrictions={selectedRestrictions}
                setSelectedRestrictions={setSelectedRestrictions}
                restrictionsOther={restrictionsOther}
                setRestrictionsOther={setRestrictionsOther}
                isLoading={isLoading}
              />
            </div>
          )}
          {currentStep === 5 && (
            <div style={{ animation: "fadeIn 0.2s ease-out" }}>
              <MeasurementsSection
                measurementMethod={measurementMethod}
                setMeasurementMethod={setMeasurementMethod}
                chest={chest}
                setChest={setChest}
                waist={waist}
                setWaist={setWaist}
                hips={hips}
                setHips={setHips}
                arms={arms}
                setArms={setArms}
                thighs={thighs}
                setThighs={setThighs}
                inBodyFile={inBodyFile}
                onInBodyFileChange={setInBodyFile}
                isLoading={isLoading}
              />
            </div>
          )}
          {currentStep === 6 && (
            <div style={{ animation: "fadeIn 0.2s ease-out" }}>
              <MedicalSection
                medicalNotes={medicalNotes}
                setMedicalNotes={setMedicalNotes}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isLoading}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {tCommon("back")}
          </Button>

          {currentStep < TOTAL_STEPS ? (
            <Button type="button" variant="gradient" onClick={handleNext} disabled={isLoading}>
              {tCommon("next")}
              <ArrowRight className="h-5 w-5 rtl:rotate-180" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="gradient"
              size="lg"
              disabled={isLoading}
              loading={isLoading}
            >
              {t(isLoading ? "submitting" : "completeAssessment")}
              {!isLoading && <ArrowRight className="h-5 w-5 rtl:rotate-180" />}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
