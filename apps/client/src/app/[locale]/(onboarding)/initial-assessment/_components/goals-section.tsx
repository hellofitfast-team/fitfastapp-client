"use client";

import { Target } from "lucide-react";
import { MultiSelect } from "@fitfast/ui/multi-select";
import { SectionCard } from "@fitfast/ui/section-card";
import { FITNESS_GOALS } from "./constants";

interface GoalsSectionProps {
  selectedGoals: string[];
  setSelectedGoals: (goals: string[]) => void;
  goalsOther: string;
  setGoalsOther: (value: string) => void;
  isLoading: boolean;
}

export function GoalsSection({
  selectedGoals,
  setSelectedGoals,
  goalsOther,
  setGoalsOther,
  isLoading,
}: GoalsSectionProps) {
  return (
    <SectionCard icon={Target} title="Fitness Goals" description="Select all that apply" variant="fitness">
      <MultiSelect
        options={FITNESS_GOALS}
        selected={selectedGoals}
        onChange={setSelectedGoals}
        otherValue={goalsOther}
        onOtherChange={setGoalsOther}
        disabled={isLoading}
        featureColor="fitness"
      />
    </SectionCard>
  );
}
