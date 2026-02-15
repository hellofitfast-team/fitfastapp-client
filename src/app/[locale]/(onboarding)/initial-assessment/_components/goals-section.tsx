"use client";

import { BrutalistMultiSelect } from "@/components/ui/brutalist-multi-select";
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
    <div className="border-4 border-black">
      <div className="border-b-4 border-black bg-primary p-4">
        <h2 className="font-black text-xl text-white">FITNESS GOALS</h2>
        <p className="font-mono text-xs text-white/80 mt-1">SELECT ALL THAT APPLY</p>
      </div>
      <div className="p-4 bg-cream">
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
  );
}
