"use client";

import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
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
      <div className="border-4 border-black">
        <div className="border-b-4 border-black bg-black p-4">
          <h2 className="font-black text-xl text-cream">BASIC INFORMATION</h2>
        </div>
        <div className="p-4 bg-cream">
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
                  className="flex-1 h-12 px-4 border-4 border-black bg-cream font-mono text-lg placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors"
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
                  className="flex-1 h-12 px-4 border-4 border-black bg-cream font-mono text-lg placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors"
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
          <h2 className="font-black text-xl text-cream">EXPERIENCE LEVEL</h2>
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
                  ? "bg-primary text-black"
                  : "bg-cream text-black hover:bg-neutral-100"
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
          <h2 className="font-black text-xl text-cream">AVAILABLE EQUIPMENT</h2>
        </div>
        <div className="p-4 bg-cream space-y-3">
          <div className="relative">
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              disabled={isLoading}
              className="w-full h-14 px-4 pr-12 border-4 border-black bg-cream font-bold text-sm uppercase appearance-none focus:outline-none focus:bg-white transition-colors cursor-pointer"
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
              className="w-full h-12 px-4 border-4 border-black bg-cream font-mono text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-colors"
            />
          )}
        </div>
      </div>
    </>
  );
}
