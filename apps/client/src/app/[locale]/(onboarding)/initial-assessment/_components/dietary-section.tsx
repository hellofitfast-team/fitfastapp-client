"use client";

import { useTranslations } from "next-intl";
import { UtensilsCrossed, Clock, ShieldAlert, Ban } from "lucide-react";
import { MultiSelect } from "@fitfast/ui/multi-select";
import { SectionCard } from "@fitfast/ui/section-card";
import { cn } from "@fitfast/ui/cn";
import {
  CUISINE_PREFERENCES,
  MEALS_PER_DAY,
  COMMON_ALLERGIES,
  DIETARY_RESTRICTIONS,
} from "./constants";

interface DietarySectionProps {
  selectedFoodPrefs: string[];
  setSelectedFoodPrefs: (prefs: string[]) => void;
  foodPrefsOther: string;
  setFoodPrefsOther: (value: string) => void;
  mealsPerDay: string;
  setMealsPerDay: (value: string) => void;
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
  mealsPerDay,
  setMealsPerDay,
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
  const t = useTranslations("onboarding.assessment");

  return (
    <div className="space-y-6">
      {/* Cuisine Preferences */}
      <SectionCard
        icon={UtensilsCrossed}
        title={t("cuisineTitle")}
        description={t("cuisineDesc")}
        variant="nutrition"
      >
        <MultiSelect
          options={CUISINE_PREFERENCES.map((item) => ({
            ...item,
            label: t(`cuisines.${item.id}`),
          }))}
          selected={selectedFoodPrefs}
          onChange={setSelectedFoodPrefs}
          otherValue={foodPrefsOther}
          onOtherChange={setFoodPrefsOther}
          disabled={isLoading}
          featureColor="nutrition"
          otherLabel={t("otherOption")}
          otherPlaceholder={t("specifyPlaceholder")}
        />
      </SectionCard>

      {/* Meals Per Day */}
      <SectionCard
        icon={Clock}
        title={t("mealsPerDayTitle")}
        description={t("mealsPerDayDesc")}
        variant="nutrition"
      >
        <div className="grid grid-cols-2 gap-2">
          {MEALS_PER_DAY.map((option) => {
            const isSelected = mealsPerDay === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setMealsPerDay(isSelected ? "" : option.id)}
                disabled={isLoading}
                className={cn(
                  "flex items-center justify-center rounded-xl border-2 px-3 py-3 text-xs font-semibold tracking-wide uppercase transition-all",
                  isSelected
                    ? "border-success-500 bg-success-500/5 text-success-500"
                    : "border-stone-200 text-stone-500 hover:border-stone-300",
                )}
              >
                {t(`mealsPerDayOptions.${option.id}`)}
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Food Allergies */}
      <SectionCard icon={ShieldAlert} title={t("allergiesTitle")} variant="nutrition">
        <MultiSelect
          options={COMMON_ALLERGIES.map((item) => ({
            ...item,
            label: t(`allergies.${item.id}`),
          }))}
          selected={selectedAllergies}
          onChange={setSelectedAllergies}
          otherValue={allergiesOther}
          onOtherChange={setAllergiesOther}
          disabled={isLoading}
          hasNoneOption={true}
          featureColor="nutrition"
          otherLabel={t("otherOption")}
          otherPlaceholder={t("specifyPlaceholder")}
        />
      </SectionCard>

      {/* Dietary Restrictions */}
      <SectionCard icon={Ban} title={t("restrictionsTitle")} variant="nutrition">
        <MultiSelect
          options={DIETARY_RESTRICTIONS.map((item) => ({
            ...item,
            label: t(`restrictions.${item.id}`),
          }))}
          selected={selectedRestrictions}
          onChange={setSelectedRestrictions}
          otherValue={restrictionsOther}
          onOtherChange={setRestrictionsOther}
          disabled={isLoading}
          hasNoneOption={true}
          featureColor="nutrition"
          otherLabel={t("otherOption")}
          otherPlaceholder={t("specifyPlaceholder")}
        />
      </SectionCard>
    </div>
  );
}
