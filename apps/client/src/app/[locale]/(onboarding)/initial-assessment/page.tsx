"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useSwipeable } from "react-swipeable";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@fitfast/ui/button";
import { AssessmentProgress } from "./_components/assessment-progress";
import { GoalsSection } from "./_components/goals-section";
import { BasicInfoSection } from "./_components/basic-info-section";
import { ScheduleSection } from "./_components/schedule-section";
import { DietarySection } from "./_components/dietary-section";
import { MedicalSection } from "./_components/medical-section";

const TOTAL_STEPS = 5;

export default function InitialAssessmentPage() {
  const t = useTranslations("onboarding.assessment");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const submitAssessment = useMutation(api.assessments.submitAssessment);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const generateMealPlan = useAction(api.ai.generateMealPlan);
  const generateWorkoutPlan = useAction(api.ai.generateWorkoutPlan);

  // Step labels from translations
  const STEP_LABELS = [
    t("steps.goals"),
    t("steps.bodyInfo"),
    t("steps.schedule"),
    t("steps.diet"),
    t("steps.medical"),
  ];

  // Form state
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [goalsOther, setGoalsOther] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [height, setHeight] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedFoodPrefs, setSelectedFoodPrefs] = useState<string[]>([]);
  const [foodPrefsOther, setFoodPrefsOther] = useState("");
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [allergiesOther, setAllergiesOther] = useState("");
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>(
    []
  );
  const [restrictionsOther, setRestrictionsOther] = useState("");
  const [equipment, setEquipment] = useState("");
  const [equipmentOther, setEquipmentOther] = useState("");
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
        const finalGoals = getFinalValues(selectedGoals, goalsOther);
        if (finalGoals.length === 0) return tErrors("goalRequired");
        return null;
      }
      case 2: {
        if (!currentWeight || !height) return tErrors("weightHeightRequired");
        if (!experienceLevel) return tErrors("experienceLevelRequired");
        if (!equipment) return tErrors("equipmentRequired");
        if (equipment === "other" && !equipmentOther.trim())
          return tErrors("equipmentSpecify");
        return null;
      }
      case 3: {
        if (selectedDays.length === 0) return tErrors("workoutDaysRequired");
        return null;
      }
      case 4:
        return null; // Dietary is optional
      case 5:
        return null; // Medical is optional
      default:
        return null;
    }
  };

  // Step navigation
  const handleNext = () => {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Swipe handlers with RTL support
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const isRtl = document.dir === "rtl";
      if (isRtl) handleBack();
      else handleNext();
    },
    onSwipedRight: () => {
      const isRtl = document.dir === "rtl";
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
      const finalGoals = getFinalValues(selectedGoals, goalsOther);
      const finalFoodPrefs = getFinalValues(selectedFoodPrefs, foodPrefsOther);
      const finalAllergies = getFinalValues(selectedAllergies, allergiesOther);
      const finalRestrictions = getFinalValues(
        selectedRestrictions,
        restrictionsOther
      );
      const finalEquipment =
        equipment === "other" ? equipmentOther.trim() : equipment;

      await submitAssessment({
        goals: finalGoals.join(", "),
        currentWeight: parseFloat(currentWeight),
        height: parseFloat(height),
        experienceLevel: experienceLevel as
          | "beginner"
          | "intermediate"
          | "advanced",
        scheduleAvailability: { days: selectedDays },
        foodPreferences:
          finalFoodPrefs.length > 0 ? finalFoodPrefs : undefined,
        allergies: finalAllergies.length > 0 ? finalAllergies : undefined,
        dietaryRestrictions:
          finalRestrictions.length > 0 ? finalRestrictions : undefined,
        medicalConditions: medicalNotes ? [medicalNotes] : undefined,
        exerciseHistory: finalEquipment,
        measurements: {},
        lifestyleHabits: { equipment: finalEquipment },
      });

      // Update profile status to active
      try {
        await updateProfile({});
        // Note: The status update is handled server-side or separately
      } catch (updateError) {
        console.error("Error updating profile:", updateError);
      }

      // Generate initial meal + workout plans from assessment data
      const language = profile.language || "en";
      try {
        await Promise.all([
          generateMealPlan({ language, planDuration: 14 }),
          generateWorkoutPlan({ language, planDuration: 14 }),
        ]);
      } catch (planError) {
        console.error("Initial plan generation error:", planError);
        // Don't block navigation -- plans can be regenerated on first check-in
      }

      router.push("/");
    } catch (err) {
      console.error("Assessment error:", err);
      setError(
        err instanceof Error ? err.message : tErrors("unexpectedError")
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {tCommon("loading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Progress Bar */}
      <AssessmentProgress
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        stepLabels={STEP_LABELS}
      />

      <form onSubmit={onSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-error-500/30 bg-error-500/10 p-4">
            <p className="text-sm font-medium text-error-500">{error}</p>
          </div>
        )}

        {/* Step content with swipe */}
        <div {...swipeHandlers} className="touch-pan-y">
          {currentStep === 1 && (
            <div style={{ animation: "fadeIn 0.2s ease-out" }}>
              <GoalsSection
                selectedGoals={selectedGoals}
                setSelectedGoals={setSelectedGoals}
                goalsOther={goalsOther}
                setGoalsOther={setGoalsOther}
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
            <Button
              type="button"
              variant="gradient"
              onClick={handleNext}
              disabled={isLoading}
            >
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
              {isLoading ? (
                t("submitting")
              ) : (
                <>
                  {t("completeAssessment")}
                  <ArrowRight className="h-5 w-5 rtl:rotate-180" />
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
