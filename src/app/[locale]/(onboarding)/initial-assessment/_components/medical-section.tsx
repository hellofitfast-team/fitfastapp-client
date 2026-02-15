"use client";

interface MedicalSectionProps {
  medicalNotes: string;
  setMedicalNotes: (value: string) => void;
  isLoading: boolean;
}

export function MedicalSection({
  medicalNotes,
  setMedicalNotes,
  isLoading,
}: MedicalSectionProps) {
  return (
    <div className="border-4 border-black">
      <div className="border-b-4 border-black bg-neutral-100 p-4">
        <h2 className="font-black text-xl text-black">MEDICAL NOTES</h2>
        <p className="font-mono text-xs text-neutral-500 mt-1">OPTIONAL: INJURIES, CONDITIONS, OR LIMITATIONS</p>
      </div>
      <div className="bg-cream">
        <textarea
          className="w-full min-h-[120px] p-4 border-0 bg-transparent font-mono text-sm placeholder:text-neutral-400 focus:outline-none resize-none"
          placeholder="E.G., KNEE INJURY, BACK PAIN, DIABETES, HIGH BLOOD PRESSURE..."
          value={medicalNotes}
          onChange={(e) => setMedicalNotes(e.target.value)}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
