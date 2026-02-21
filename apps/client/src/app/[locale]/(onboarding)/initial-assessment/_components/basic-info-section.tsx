"use client";

import { useTranslations } from "next-intl";
import { User, Dumbbell, Wrench } from "lucide-react";
import { SectionCard } from "@fitfast/ui/section-card";
import { FormField } from "@fitfast/ui/form-field";
import { Input } from "@fitfast/ui/input";
import { cn } from "@fitfast/ui/cn";
import { EQUIPMENT_OPTIONS } from "./constants";

interface BasicInfoSectionProps {
  currentWeight: string;
  setCurrentWeight: (value: string) => void;
  height: string;
  setHeight: (value: string) => void;
  experienceLevel: string;
  setExperienceLevel: (value: string) => void;
  equipment: string;
  setEquipment: (value: string) => void;
  equipmentOther: string;
  setEquipmentOther: (value: string) => void;
  isLoading: boolean;
}

export function BasicInfoSection({
  currentWeight,
  setCurrentWeight,
  height,
  setHeight,
  experienceLevel,
  setExperienceLevel,
  equipment,
  setEquipment,
  equipmentOther,
  setEquipmentOther,
  isLoading,
}: BasicInfoSectionProps) {
  const tUnits = useTranslations("units");

  return (
    <>
      {/* Basic Information */}
      <SectionCard icon={User} title="Basic Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Current Weight">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                placeholder="75"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                disabled={isLoading}
              />
              <span className="font-semibold text-sm text-muted-foreground">{tUnits("kg")}</span>
            </div>
          </FormField>
          <FormField label="Height">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="175"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                disabled={isLoading}
              />
              <span className="font-semibold text-sm text-muted-foreground">{tUnits("cm")}</span>
            </div>
          </FormField>
        </div>
      </SectionCard>

      {/* Experience Level */}
      <SectionCard icon={Dumbbell} title="Experience Level" variant="fitness">
        <div className="flex flex-col gap-2">
          {([
            { id: "beginner", label: "Beginner", desc: "New to fitness" },
            { id: "intermediate", label: "Intermediate", desc: "1-2 years" },
            { id: "advanced", label: "Advanced", desc: "3+ years" },
          ] as const).map((level) => (
            <button
              key={level.id}
              type="button"
              onClick={() => setExperienceLevel(level.id)}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-lg border transition-colors text-start",
                experienceLevel === level.id
                  ? "border-[#F97316]/30 bg-[#F97316]/8"
                  : "border-border bg-card hover:bg-neutral-50",
                isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.97]"
              )}
            >
              <div className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                experienceLevel === level.id
                  ? "border-[#F97316]/30 bg-[#F97316]/12 text-[#F97316]"
                  : "border-border bg-neutral-50 text-muted-foreground"
              )}>
                {level.id === "beginner" ? "1" : level.id === "intermediate" ? "2" : "3"}
              </div>
              <div>
                <span className={cn(
                  "block font-semibold text-sm",
                  experienceLevel === level.id && "text-[#F97316]"
                )}>{level.label}</span>
                <span className="block text-xs text-muted-foreground">{level.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Equipment */}
      <SectionCard icon={Wrench} title="Available Equipment" variant="fitness">
        <div className="space-y-3">
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            disabled={isLoading}
            className="w-full h-11 px-3.5 rounded-lg border border-input bg-card text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          >
            <option value="">Select your equipment access</option>
            {EQUIPMENT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {equipment === "other" && (
            <Input
              type="text"
              placeholder="Describe your equipment..."
              value={equipmentOther}
              onChange={(e) => setEquipmentOther(e.target.value)}
              disabled={isLoading}
            />
          )}
        </div>
      </SectionCard>
    </>
  );
}
