"use client";

import { BrutalistMultiSelect } from "@/components/ui/brutalist-multi-select";
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
      {/* Food Preferences */}
      <div className="border-4 border-black">
        <div className="border-b-4 border-black bg-black p-4">
          <h2 className="font-black text-xl text-cream">FOOD PREFERENCES</h2>
          <p className="font-mono text-xs text-primary mt-1">SELECT YOUR PREFERRED CUISINE STYLES</p>
        </div>
        <div className="p-4 bg-cream">
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
          <h2 className="font-black text-xl text-cream">FOOD ALLERGIES</h2>
        </div>
        <div className="p-4 bg-cream">
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
          <h2 className="font-black text-xl text-cream">DIETARY RESTRICTIONS</h2>
        </div>
        <div className="p-4 bg-cream">
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
    </>
  );
}
