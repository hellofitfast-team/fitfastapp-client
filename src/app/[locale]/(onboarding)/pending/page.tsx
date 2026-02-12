"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Clock, CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function PendingPage() {
  const t = useTranslations("onboarding.pending");
  const router = useRouter();
  const { profile, refetch } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const steps = [
    {
      icon: CheckCircle2,
      title: "ASSESSMENT COMPLETE",
      description: "Your initial assessment has been submitted",
      complete: true,
    },
    {
      icon: Clock,
      title: "UNDER REVIEW",
      description: "Your coach is reviewing your application",
      complete: false,
      active: true,
    },
    {
      icon: Mail,
      title: "APPROVAL NOTIFICATION",
      description: "You'll receive an email when approved",
      complete: false,
    },
  ];

  const handleCheckStatus = async () => {
    setIsChecking(true);

    await refetch();

    if (profile?.status === "active") {
      router.push("/");
      router.refresh();
    }

    setIsChecking(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center border-4 border-black bg-primary p-8">
        <div className="inline-flex h-20 w-20 items-center justify-center bg-white mb-6">
          <Clock className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight">
          {t("title").toUpperCase()}
        </h1>
        <p className="mt-4 font-mono text-sm tracking-[0.2em] text-white/80">
          {t("subtitle").toUpperCase()}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="border-4 border-black">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex items-start gap-6 p-6 ${
              index !== steps.length - 1 ? "border-b-4 border-black" : ""
            } ${
              step.complete
                ? "bg-success-500/10"
                : step.active
                  ? "bg-primary/10"
                  : "bg-neutral-100"
            }`}
          >
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center border-4 border-black ${
                step.complete
                  ? "bg-success-500 text-black"
                  : step.active
                    ? "bg-primary text-white"
                    : "bg-neutral-200 text-neutral-400"
              }`}
            >
              <step.icon className="h-7 w-7" />
            </div>
            <div>
              <p className={`font-black text-xl ${
                step.complete || step.active ? "text-black" : "text-neutral-400"
              }`}>
                {step.title}
              </p>
              <p className="font-mono text-xs tracking-[0.1em] text-neutral-500 mt-1 uppercase">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="border-4 border-black bg-black text-cream p-6">
        <p className="font-mono text-xs tracking-[0.2em] text-primary mb-2">INFO</p>
        <p className="font-bold uppercase">{t("message")}</p>
      </div>

      {/* Current Status */}
      {profile && (
        <div className="border-4 border-black p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-neutral-500 mb-1">
              CURRENT STATUS
            </p>
            <span className="inline-flex items-center border-4 border-primary bg-primary/10 px-4 py-2 font-black text-primary uppercase">
              {profile.status.replace("_", " ")}
            </span>
          </div>
          <button
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="flex items-center gap-2 h-12 px-6 bg-black text-cream font-bold text-sm uppercase tracking-wide hover:bg-primary disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
            {t("checkStatus").toUpperCase()}
          </button>
        </div>
      )}

      {/* Help Text */}
      <div className="text-center p-6 border-4 border-black bg-neutral-100">
        <p className="font-mono text-xs tracking-[0.15em] text-neutral-500 uppercase">
          Approval typically takes 24-48 hours.
          <br />
          You'll receive an email notification when approved.
        </p>
      </div>
    </div>
  );
}
