"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Check, ArrowRight, ChevronDown } from "lucide-react";

// Predefined options for deterministic AI generation
const FITNESS_GOALS = [
  { id: "lose_weight", label: "LOSE WEIGHT" },
  { id: "build_muscle", label: "BUILD MUSCLE" },
  { id: "improve_endurance", label: "IMPROVE ENDURANCE" },
  { id: "increase_strength", label: "INCREASE STRENGTH" },
  { id: "improve_flexibility", label: "IMPROVE FLEXIBILITY" },
  { id: "general_fitness", label: "GENERAL FITNESS" },
  { id: "body_recomposition", label: "BODY RECOMPOSITION" },
  { id: "athletic_performance", label: "ATHLETIC PERFORMANCE" },
];

const FOOD_PREFERENCES = [
  { id: "mediterranean", label: "MEDITERRANEAN" },
  { id: "high_protein", label: "HIGH PROTEIN" },
  { id: "low_carb", label: "LOW CARB" },
  { id: "balanced", label: "BALANCED DIET" },
  { id: "middle_eastern", label: "MIDDLE EASTERN" },
  { id: "asian", label: "ASIAN CUISINE" },
  { id: "vegetarian", label: "VEGETARIAN" },
  { id: "vegan", label: "VEGAN" },
];

const COMMON_ALLERGIES = [
  { id: "none", label: "NONE" },
  { id: "nuts", label: "NUTS" },
  { id: "dairy", label: "DAIRY" },
  { id: "eggs", label: "EGGS" },
  { id: "shellfish", label: "SHELLFISH" },
  { id: "gluten", label: "GLUTEN" },
  { id: "soy", label: "SOY" },
  { id: "fish", label: "FISH" },
];

const DIETARY_RESTRICTIONS = [
  { id: "none", label: "NONE" },
  { id: "halal", label: "HALAL" },
  { id: "kosher", label: "KOSHER" },
  { id: "no_pork", label: "NO PORK" },
  { id: "no_beef", label: "NO BEEF" },
  { id: "lactose_free", label: "LACTOSE FREE" },
  { id: "low_sodium", label: "LOW SODIUM" },
  { id: "diabetic_friendly", label: "DIABETIC FRIENDLY" },
];

const EQUIPMENT_OPTIONS = [
  { id: "full_gym", label: "FULL GYM ACCESS" },
  { id: "home_basic", label: "HOME (BASIC: DUMBBELLS, MAT)" },
  { id: "home_advanced", label: "HOME (ADVANCED: BENCH, BARBELL)" },
  { id: "bodyweight", label: "BODYWEIGHT ONLY" },
  { id: "resistance_bands", label: "RESISTANCE BANDS" },
  { id: "other", label: "OTHER" },
];

const DAYS = [
  { id: "Mon", label: "M" },
  { id: "Tue", label: "T" },
  { id: "Wed", label: "W" },
  { id: "Thu", label: "T" },
  { id: "Fri", label: "F" },
  { id: "Sat", label: "S" },
  { id: "Sun", label: "S" },
];

// Brutalist Multi-select checkbox component
function BrutalistMultiSelect({
  options,
  selected,
  onChange,
  otherValue,
  onOtherChange,
  disabled,
  columns = 2,
  hasNoneOption = false,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  otherValue: string;
  onOtherChange: (value: string) => void;
  disabled?: boolean;
  columns?: number;
  hasNoneOption?: boolean;
}) {
  const toggle = (id: string) => {
    if (id === "none") {
      onChange(selected.includes("none") ? [] : ["none"]);
      onOtherChange("");
    } else if (id === "other") {
      const newSelected = selected.filter((s) => s !== "none");
      if (newSelected.includes("other")) {
        onChange(newSelected.filter((s) => s !== "other"));
        onOtherChange("");
      } else {
        onChange([...newSelected, "other"]);
      }
    } else {
      const newSelected = selected.filter((s) => s !== "none");
      if (newSelected.includes(id)) {
        onChange(newSelected.filter((s) => s !== id));
      } else {
        onChange([...newSelected, id]);
      }
    }
  };

  const allOptions = [...options, { id: "other", label: "OTHER" }];

  return (
    <div className="space-y-3">
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: "0" }}>
        {allOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            disabled={disabled || (hasNoneOption && selected.includes("none") && option.id !== "none")}
            className={`flex items-center gap-3 border-2 border-black p-4 text-left text-sm font-bold transition-colors -mt-0.5 -ml-0.5 first:mt-0 first:ml-0 ${
              selected.includes(option.id)
                ? "bg-black text-[#00FF94]"
                : "bg-[#FFFEF5] text-black hover:bg-neutral-100"
            } ${disabled || (hasNoneOption && selected.includes("none") && option.id !== "none") ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 border-black ${
                selected.includes(option.id)
                  ? "bg-[#00FF94]"
                  : "bg-white"
              }`}
            >
              {selected.includes(option.id) && (
                <Check className="h-4 w-4 text-black" strokeWidth={3} />
              )}
            </div>
            <span className="tracking-wide">{option.label}</span>
          </button>
        ))}
      </div>
      {selected.includes("other") && (
        <input
          type="text"
          placeholder="PLEASE SPECIFY..."
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          disabled={disabled}
          className="w-full h-12 px-4 border-4 border-black bg-[#FFFEF5] font-mono text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors"
        />
      )}
    </div>
  );
}

export default function InitialAssessmentPage() {
  const t = useTranslations("onboarding.assessment");
  const tUnits = useTranslations("units");
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
        <div className="border-4 border-black bg-[#FFFEF5] p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-12 h-12 border-4 border-black border-t-[#00FF94] animate-spin mx-auto mb-4" />
          <p className="font-bold text-sm uppercase tracking-wide text-center">{tCommon("loading").toUpperCase()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="text-center border-4 border-black bg-black p-6">
        <h1 className="text-3xl md:text-4xl font-black text-[#FFFEF5] tracking-tight">
          {t("title").toUpperCase()}
        </h1>
        <p className="mt-2 font-mono text-xs tracking-[0.2em] text-[#00FF94]">
          {t("subtitle").toUpperCase()}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {error && (
          <div className="border-4 border-[#FF3B00] bg-[#FF3B00]/10 p-4">
            <p className="font-bold text-[#FF3B00] text-sm uppercase">{error}</p>
          </div>
        )}

        {/* Fitness Goals */}
        <div className="border-4 border-black">
          <div className="border-b-4 border-black bg-[#FF3B00] p-4">
            <h2 className="font-black text-xl text-white">FITNESS GOALS</h2>
            <p className="font-mono text-xs text-white/80 mt-1">SELECT ALL THAT APPLY</p>
          </div>
          <div className="p-4 bg-[#FFFEF5]">
            <BrutalistMultiSelect
              options={FITNESS_GOALS}
              selected={selectedGoals}
              onChange={setSelectedGoals}
              otherValue={goalsOther}
              onOtherChange={setGoalsOther}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Basic Info */}
        <div className="border-4 border-black">
          <div className="border-b-4 border-black bg-black p-4">
            <h2 className="font-black text-xl text-[#FFFEF5]">BASIC INFORMATION</h2>
          </div>
          <div className="p-4 bg-[#FFFEF5]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-bold text-sm uppercase tracking-wide mb-2">
                  CURRENT WEIGHT
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="75"
                    value={currentWeight}
                    onChange={(e) => setCurrentWeight(e.target.value)}
                    disabled={isLoading}
                    className="flex-1 h-12 px-4 border-4 border-black bg-[#FFFEF5] font-mono text-lg placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors"
                  />
                  <span className="font-black text-lg">{tUnits("kg").toUpperCase()}</span>
                </div>
              </div>
              <div>
                <label className="block font-bold text-sm uppercase tracking-wide mb-2">
                  HEIGHT
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="175"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    disabled={isLoading}
                    className="flex-1 h-12 px-4 border-4 border-black bg-[#FFFEF5] font-mono text-lg placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors"
                  />
                  <span className="font-black text-lg">{tUnits("cm").toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Experience Level */}
        <div className="border-4 border-black">
          <div className="border-b-4 border-black bg-black p-4">
            <h2 className="font-black text-xl text-[#FFFEF5]">EXPERIENCE LEVEL</h2>
          </div>
          <div className="grid grid-cols-3">
            {(["beginner", "intermediate", "advanced"] as const).map((level, index) => (
              <button
                key={level}
                type="button"
                onClick={() => setExperienceLevel(level)}
                disabled={isLoading}
                className={`p-6 text-center transition-colors ${
                  index < 2 ? "border-r-4 border-black" : ""
                } ${
                  experienceLevel === level
                    ? "bg-[#00FF94] text-black"
                    : "bg-[#FFFEF5] text-black hover:bg-neutral-100"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span className="block font-black text-lg uppercase">{level}</span>
                <span className="block font-mono text-xs text-neutral-500 mt-1">
                  {level === "beginner" && "NEW TO FITNESS"}
                  {level === "intermediate" && "1-2 YEARS"}
                  {level === "advanced" && "3+ YEARS"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div className="border-4 border-black">
          <div className="border-b-4 border-black bg-black p-4">
            <h2 className="font-black text-xl text-[#FFFEF5]">AVAILABLE EQUIPMENT</h2>
          </div>
          <div className="p-4 bg-[#FFFEF5] space-y-3">
            <div className="relative">
              <select
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                disabled={isLoading}
                className="w-full h-14 px-4 pr-12 border-4 border-black bg-[#FFFEF5] font-bold text-sm uppercase appearance-none focus:outline-none focus:bg-white transition-colors cursor-pointer"
              >
                <option value="">SELECT YOUR EQUIPMENT ACCESS</option>
                {EQUIPMENT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none" />
            </div>
            {equipment === "other" && (
              <input
                type="text"
                placeholder="DESCRIBE YOUR EQUIPMENT..."
                value={equipmentOther}
                onChange={(e) => setEquipmentOther(e.target.value)}
                disabled={isLoading}
                className="w-full h-12 px-4 border-4 border-black bg-[#FFFEF5] font-mono text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors"
              />
            )}
          </div>
        </div>

        {/* Schedule */}
        <div className="border-4 border-black">
          <div className="border-b-4 border-black bg-[#FF3B00] p-4">
            <h2 className="font-black text-xl text-white">WEEKLY SCHEDULE</h2>
            <p className="font-mono text-xs text-white/80 mt-1">SELECT YOUR WORKOUT DAYS</p>
          </div>
          <div className="p-4 bg-[#FFFEF5]">
            <div className="flex gap-0">
              {DAYS.map((day, index) => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => {
                    if (selectedDays.includes(day.id)) {
                      setSelectedDays(selectedDays.filter((d) => d !== day.id));
                    } else {
                      setSelectedDays([...selectedDays, day.id]);
                    }
                  }}
                  disabled={isLoading}
                  className={`flex-1 h-16 flex items-center justify-center border-4 border-black font-black text-lg transition-colors -ml-1 first:ml-0 ${
                    selectedDays.includes(day.id)
                      ? "bg-black text-[#00FF94]"
                      : "bg-[#FFFEF5] text-black hover:bg-neutral-100"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-2 px-1 font-mono text-[10px] text-neutral-400">
              <span>MON</span>
              <span>TUE</span>
              <span>WED</span>
              <span>THU</span>
              <span>FRI</span>
              <span>SAT</span>
              <span>SUN</span>
            </div>
          </div>
        </div>

        {/* Food Preferences */}
        <div className="border-4 border-black">
          <div className="border-b-4 border-black bg-black p-4">
            <h2 className="font-black text-xl text-[#FFFEF5]">FOOD PREFERENCES</h2>
            <p className="font-mono text-xs text-[#00FF94] mt-1">SELECT YOUR PREFERRED CUISINE STYLES</p>
          </div>
          <div className="p-4 bg-[#FFFEF5]">
            <BrutalistMultiSelect
              options={FOOD_PREFERENCES}
              selected={selectedFoodPrefs}
              onChange={setSelectedFoodPrefs}
              otherValue={foodPrefsOther}
              onOtherChange={setFoodPrefsOther}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Allergies */}
        <div className="border-4 border-black">
          <div className="border-b-4 border-black bg-black p-4">
            <h2 className="font-black text-xl text-[#FFFEF5]">FOOD ALLERGIES</h2>
          </div>
          <div className="p-4 bg-[#FFFEF5]">
            <BrutalistMultiSelect
              options={COMMON_ALLERGIES}
              selected={selectedAllergies}
              onChange={setSelectedAllergies}
              otherValue={allergiesOther}
              onOtherChange={setAllergiesOther}
              disabled={isLoading}
              columns={4}
              hasNoneOption={true}
            />
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div className="border-4 border-black">
          <div className="border-b-4 border-black bg-black p-4">
            <h2 className="font-black text-xl text-[#FFFEF5]">DIETARY RESTRICTIONS</h2>
          </div>
          <div className="p-4 bg-[#FFFEF5]">
            <BrutalistMultiSelect
              options={DIETARY_RESTRICTIONS}
              selected={selectedRestrictions}
              onChange={setSelectedRestrictions}
              otherValue={restrictionsOther}
              onOtherChange={setRestrictionsOther}
              disabled={isLoading}
              hasNoneOption={true}
            />
          </div>
        </div>

        {/* Medical Notes */}
        <div className="border-4 border-black">
          <div className="border-b-4 border-black bg-neutral-100 p-4">
            <h2 className="font-black text-xl text-black">MEDICAL NOTES</h2>
            <p className="font-mono text-xs text-neutral-500 mt-1">OPTIONAL: INJURIES, CONDITIONS, OR LIMITATIONS</p>
          </div>
          <div className="bg-[#FFFEF5]">
            <textarea
              className="w-full min-h-[120px] p-4 border-0 bg-transparent font-mono text-sm placeholder:text-neutral-400 focus:outline-none resize-none"
              placeholder="E.G., KNEE INJURY, BACK PAIN, DIABETES, HIGH BLOOD PRESSURE..."
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-16 bg-[#FF3B00] text-white font-black text-xl uppercase tracking-wide hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
          {isLoading ? (
            <span className="animate-pulse">CREATING YOUR PLAN...</span>
          ) : (
            <>
              COMPLETE ASSESSMENT
              <ArrowRight className="h-6 w-6" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
