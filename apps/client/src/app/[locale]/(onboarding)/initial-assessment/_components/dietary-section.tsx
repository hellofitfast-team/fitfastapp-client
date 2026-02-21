"use client";

import { UtensilsCrossed, ShieldAlert, Ban } from "lucide-react";
import { MultiSelect } from "@fitfast/ui/multi-select";
import { SectionCard } from "@fitfast/ui/section-card";
import { FOOD_PREFERENCES, COMMON_ALLERGIES, DIETARY_RESTRICTIONS } from "./constants";

interface DietarySectionProps {
  selectedFoodPrefs: string[];
  setSelectedFoodPrefs: (prefs: string[]) => void;
  foodPrefsOther: string;
  setFoodPrefsOther: (value: string) => void;
  selectedAllergies: string[];
  setSelectedAllergies: (allergies: string[]) => void;
  allergiesOther: string;
  setAllergiesOther: (value: string) => void;
  selectedRestrictions: string[];
  setSelectedRestrictions: (restrictions: string[]) => void;
  restrictionsOther: string;
  setRestrictionsOther: (value: string) => void;
  isLoading: boolean;
}

export function DietarySection({
  selectedFoodPrefs,
  setSelectedFoodPrefs,
  foodPrefsOther,
  setFoodPrefsOther,
  selectedAllergies,
  setSelectedAllergies,
  allergiesOther,
  setAllergiesOther,
  selectedRestrictions,
  setSelectedRestrictions,
  restrictionsOther,
  setRestrictionsOther,
  isLoading,
}: DietarySectionProps) {
  return (
    <>
      <SectionCard icon={UtensilsCrossed} title="Food Preferences" description="Select your preferred cuisine styles" variant="nutrition">
        <MultiSelect
          options={FOOD_PREFERENCES}
          selected={selectedFoodPrefs}
          onChange={setSelectedFoodPrefs}
          otherValue={foodPrefsOther}
          onOtherChange={setFoodPrefsOther}
          disabled={isLoading}
          featureColor="nutrition"
        />
      </SectionCard>

      <SectionCard icon={ShieldAlert} title="Food Allergies" variant="nutrition">
        <MultiSelect
          options={COMMON_ALLERGIES}
          selected={selectedAllergies}
          onChange={setSelectedAllergies}
          otherValue={allergiesOther}
          onOtherChange={setAllergiesOther}
          disabled={isLoading}
          hasNoneOption={true}
          featureColor="nutrition"
        />
      </SectionCard>

      <SectionCard icon={Ban} title="Dietary Restrictions" variant="nutrition">
        <MultiSelect
          options={DIETARY_RESTRICTIONS}
          selected={selectedRestrictions}
          onChange={setSelectedRestrictions}
          otherValue={restrictionsOther}
          onOtherChange={setRestrictionsOther}
          disabled={isLoading}
          hasNoneOption={true}
          featureColor="nutrition"
        />
      </SectionCard>
    </>
  );
}
