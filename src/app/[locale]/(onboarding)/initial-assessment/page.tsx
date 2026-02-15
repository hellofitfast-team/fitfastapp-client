"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight } from "lucide-react";
import { GoalsSection } from "./_components/goals-section";
import { BasicInfoSection } from "./_components/basic-info-section";
import { ScheduleSection } from "./_components/schedule-section";
import { DietarySection } from "./_components/dietary-section";
import { MedicalSection } from "./_components/medical-section";

export default function InitialAssessmentPage() {
  const t = useTranslations("onboarding.assessment");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalGoals = getFinalValues(selectedGoals, goalsOther);
    if (finalGoals.length === 0) {
      setError(tErrors("goalRequired"));
      return;
    }
    if (!currentWeight || !height) {
      setError(tErrors("weightHeightRequired"));
      return;
    }
    if (!experienceLevel) {
      setError(tErrors("experienceLevelRequired"));
      return;
    }
    if (selectedDays.length === 0) {
      setError(tErrors("workoutDaysRequired"));
      return;
    }
    if (!equipment) {
      setError(tErrors("equipmentRequired"));
      return;
    }
    if (equipment === "other" && !equipmentOther.trim()) {
      setError(tErrors("equipmentSpecify"));
      return;
    }

    if (!user) {
      setError(tErrors("signInRequired"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const finalFoodPrefs = getFinalValues(selectedFoodPrefs, foodPrefsOther);
      const finalAllergies = getFinalValues(selectedAllergies, allergiesOther);
      const finalRestrictions = getFinalValues(selectedRestrictions, restrictionsOther);
      const finalEquipment = equipment === "other" ? equipmentOther.trim() : equipment;

      const { error: insertError } = await supabase
        .from("initial_assessments")
        .insert({
          user_id: user.id,
          goals: finalGoals.join(", "),
          current_weight: parseFloat(currentWeight),
          height: parseFloat(height),
          experience_level: experienceLevel,
          schedule_availability: { days: selectedDays },
          food_preferences: finalFoodPrefs.length > 0 ? finalFoodPrefs : null,
          allergies: finalAllergies.length > 0 ? finalAllergies : null,
          dietary_restrictions: finalRestrictions.length > 0 ? finalRestrictions : null,
          medical_conditions: medicalNotes ? [medicalNotes] : null,
          injuries: null,
          exercise_history: finalEquipment,
          measurements: {},
          lifestyle_habits: { equipment: finalEquipment },
        } as any);

      if (insertError) {
        setError(insertError.message);
        return;
      }

      const { error: updateError } = await (supabase
        .from("profiles") as any)
        .update({ status: "active" })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating profile:", updateError);
      }

      // Generate initial meal + workout plans from assessment data
      try {
        await Promise.all([
          fetch("/api/plans/meal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planDuration: 14 }),
          }),
          fetch("/api/plans/workout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planDuration: 14 }),
          }),
        ]);
      } catch (planError) {
        console.error("Initial plan generation error:", planError);
        // Don't block navigation — plans can be regenerated on first check-in
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Assessment error:", err);
      setError(tErrors("unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-4 border-black bg-cream p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-12 h-12 border-4 border-black border-t-primary animate-spin mx-auto mb-4" />
          <p className="font-bold text-sm uppercase tracking-wide text-center">{tCommon("loading").toUpperCase()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="text-center border-4 border-black bg-black p-6">
        <h1 className="text-3xl md:text-4xl font-black text-cream tracking-tight">
          {t("title").toUpperCase()}
        </h1>
        <p className="mt-2 font-mono text-xs tracking-[0.2em] text-primary">
          {t("subtitle").toUpperCase()}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {error && (
          <div className="border-4 border-error-500 bg-error-500/10 p-4">
            <p className="font-bold text-error-500 text-sm uppercase">{error}</p>
          </div>
        )}

        <GoalsSection
          selectedGoals={selectedGoals}
          setSelectedGoals={setSelectedGoals}
          goalsOther={goalsOther}
          setGoalsOther={setGoalsOther}
          isLoading={isLoading}
        />

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

        <ScheduleSection
          selectedDays={selectedDays}
          setSelectedDays={setSelectedDays}
          isLoading={isLoading}
        />

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

        <MedicalSection
          medicalNotes={medicalNotes}
          setMedicalNotes={setMedicalNotes}
          isLoading={isLoading}
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-16 bg-primary text-white font-black text-xl uppercase tracking-wide hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
          {isLoading ? (
            <span className="animate-pulse">CREATING YOUR PLAN...</span>
          ) : (
            <>
              COMPLETE ASSESSMENT
              <ArrowRight className="h-6 w-6 rtl:rotate-180" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
