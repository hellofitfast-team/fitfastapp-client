"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as Sentry from "@sentry/nextjs";

type Plan = {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  currency: string;
  duration: string;
  durationAr: string;
  features: string[];
  featuresAr: string[];
  badge?: string;
  badgeAr?: string;
};

const MAX_PLANS = 4;

function generateId() {
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const emptyPlan = (): Plan => ({
  id: generateId(),
  name: "",
  nameAr: "",
  price: 0,
  currency: "EGP",
  duration: "",
  durationAr: "",
  features: [""],
  featuresAr: [""],
  badge: undefined,
  badgeAr: undefined,
});

export function PlansManager() {
  const t = useTranslations("settings");
  const serverPlans = useQuery(api.systemConfig.getPlans);
  const updatePlans = useMutation(api.systemConfig.updatePlans);

  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Initialize local state once server data arrives
  useEffect(() => {
    if (serverPlans !== undefined && plans === null) {
      setPlans(serverPlans.length > 0 ? serverPlans : []);
    }
  }, [serverPlans, plans]);

  if (plans === null) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl border border-stone-200 bg-stone-50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const handleAddPlan = () => {
    if (plans.length >= MAX_PLANS) return;
    setPlans([...plans, emptyPlan()]);
  };

  const handleRemovePlan = (id: string) => {
    if (confirmRemoveId === id) {
      setPlans(plans.filter((p) => p.id !== id));
      setConfirmRemoveId(null);
    } else {
      setConfirmRemoveId(id);
    }
  };

  const handlePlanChange = <K extends keyof Plan>(
    id: string,
    field: K,
    value: Plan[K]
  ) => {
    setPlans(plans.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleFeatureChange = (
    planId: string,
    index: number,
    value: string,
    lang: "en" | "ar"
  ) => {
    const field = lang === "en" ? "features" : "featuresAr";
    setPlans(
      plans.map((p) => {
        if (p.id !== planId) return p;
        const updated = [...p[field]];
        updated[index] = value;
        return { ...p, [field]: updated };
      })
    );
  };

  const handleAddFeature = (planId: string) => {
    setPlans(
      plans.map((p) => {
        if (p.id !== planId) return p;
        return {
          ...p,
          features: [...p.features, ""],
          featuresAr: [...p.featuresAr, ""],
        };
      })
    );
  };

  const handleRemoveFeature = (planId: string, index: number) => {
    setPlans(
      plans.map((p) => {
        if (p.id !== planId) return p;
        return {
          ...p,
          features: p.features.filter((_, i) => i !== index),
          featuresAr: p.featuresAr.filter((_, i) => i !== index),
        };
      })
    );
  };

  const handleSave = async () => {
    // Validate
    for (const plan of plans) {
      if (!plan.name.trim()) {
        toast({
          title: t("savePlansError"),
          description: `Plan "${plan.name || "Unnamed"}" requires an English name.`,
          variant: "destructive",
        });
        return;
      }
      if (plan.price <= 0) {
        toast({
          title: t("savePlansError"),
          description: `Plan "${plan.name}" must have a price greater than 0.`,
          variant: "destructive",
        });
        return;
      }
      if (plan.features.every((f) => !f.trim())) {
        toast({
          title: t("savePlansError"),
          description: `Plan "${plan.name}" needs at least one feature.`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      // Clean up empty features
      const cleanPlans = plans.map((p) => ({
        ...p,
        features: p.features.filter((f) => f.trim()),
        featuresAr: p.featuresAr.filter((f) => f.trim()),
        badge: p.badge || undefined,
        badgeAr: p.badgeAr || undefined,
      }));
      await updatePlans({ plans: cleanPlans });
      toast({
        title: t("savePlansSuccess"),
        description: t("savePlansSuccessDescription"),
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: "admin-settings", operation: "update-plans" },
      });
      toast({
        title: t("savePlansError"),
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-4">
      {plans.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-200 p-8 text-center">
          <p className="text-sm text-stone-400">No plans yet. Add your first pricing plan.</p>
        </div>
      )}

      {plans.map((plan, planIndex) => (
        <div
          key={plan.id}
          className="rounded-xl border border-stone-200 bg-white overflow-hidden"
        >
          {/* Plan header */}
          <div className="flex items-center justify-between px-4 py-3 bg-stone-50/50 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-stone-300" />
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                {t("planCard")} {planIndex + 1}
              </span>
            </div>
            <button
              onClick={() => handleRemovePlan(plan.id)}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                confirmRemoveId === plan.id
                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-stone-200 text-stone-400 hover:border-red-200 hover:text-red-600"
              }`}
            >
              <Trash2 className="h-3 w-3" />
              {confirmRemoveId === plan.id ? t("confirmRemovePlan") : t("removePlan")}
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  {t("planName")}
                </label>
                <input
                  type="text"
                  value={plan.name}
                  onChange={(e) => handlePlanChange(plan.id, "name", e.target.value)}
                  placeholder={t("planNamePlaceholder")}
                  className="w-full h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  {t("planNameAr")}
                </label>
                <input
                  type="text"
                  value={plan.nameAr}
                  onChange={(e) => handlePlanChange(plan.id, "nameAr", e.target.value)}
                  placeholder={t("planNameArPlaceholder")}
                  dir="rtl"
                  className="w-full h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Price & Currency row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  {t("price")}
                </label>
                <input
                  type="number"
                  min="0"
                  value={plan.price}
                  onChange={(e) =>
                    handlePlanChange(plan.id, "price", Number(e.target.value))
                  }
                  placeholder={t("pricePlaceholder")}
                  className="w-full h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  {t("currency")}
                </label>
                <input
                  type="text"
                  value={plan.currency}
                  onChange={(e) =>
                    handlePlanChange(plan.id, "currency", e.target.value)
                  }
                  placeholder={t("currencyPlaceholder")}
                  className="w-full h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Duration row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  {t("duration")}
                </label>
                <input
                  type="text"
                  value={plan.duration}
                  onChange={(e) =>
                    handlePlanChange(plan.id, "duration", e.target.value)
                  }
                  placeholder={t("durationPlaceholder")}
                  className="w-full h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  {t("durationAr")}
                </label>
                <input
                  type="text"
                  value={plan.durationAr}
                  onChange={(e) =>
                    handlePlanChange(plan.id, "durationAr", e.target.value)
                  }
                  placeholder={t("durationArPlaceholder")}
                  dir="rtl"
                  className="w-full h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Badge row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  {t("badge")}
                </label>
                <select
                  value={plan.badge ?? ""}
                  onChange={(e) =>
                    handlePlanChange(
                      plan.id,
                      "badge",
                      e.target.value || undefined
                    )
                  }
                  className="w-full h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="">{t("noBadge")}</option>
                  <option value="Most Popular">{t("badgeMostPopular")}</option>
                  <option value="Best Value">{t("badgeBestValue")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  {t("badgeAr")}
                </label>
                <select
                  value={plan.badgeAr ?? ""}
                  onChange={(e) =>
                    handlePlanChange(
                      plan.id,
                      "badgeAr",
                      e.target.value || undefined
                    )
                  }
                  dir="rtl"
                  className="w-full h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="">{t("noBadge")}</option>
                  <option value="الأكثر شيوعاً">{t("badgeMostPopularAr")}</option>
                  <option value="أفضل قيمة">{t("badgeBestValueAr")}</option>
                </select>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3">
              {/* EN features */}
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-2">
                  {t("features")}
                </label>
                <div className="space-y-2">
                  {plan.features.map((feature, fi) => (
                    <div key={fi} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) =>
                          handleFeatureChange(plan.id, fi, e.target.value, "en")
                        }
                        placeholder={t("featurePlaceholder")}
                        className="flex-1 h-9 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      {plan.features.length > 1 && (
                        <button
                          onClick={() => handleRemoveFeature(plan.id, fi)}
                          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:border-red-200 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => handleAddFeature(plan.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/70 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t("addFeature")}
                  </button>
                </div>
              </div>

              {/* AR features */}
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-2">
                  {t("featuresAr")}
                </label>
                <div className="space-y-2">
                  {plan.featuresAr.map((feature, fi) => (
                    <div key={fi} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) =>
                          handleFeatureChange(plan.id, fi, e.target.value, "ar")
                        }
                        placeholder={t("featureArPlaceholder")}
                        dir="rtl"
                        className="flex-1 h-9 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Add plan button */}
      {plans.length < MAX_PLANS ? (
        <button
          onClick={handleAddPlan}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 py-3 text-sm font-medium text-stone-400 hover:border-primary/30 hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("addPlan")}
        </button>
      ) : (
        <p className="text-center text-xs text-stone-400">{t("maxPlansReached")}</p>
      )}

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-md shadow-primary/20"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : t("savePlans")}
        </button>
      </div>
    </div>
  );
}
