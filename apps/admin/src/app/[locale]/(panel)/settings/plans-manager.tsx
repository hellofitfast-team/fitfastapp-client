"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useConvexAuth, useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, Trash2, GripVertical, Check, Loader2 } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { SaveButton } from "./save-button";

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

// ── Duration options (dropdown) ──────────────────────────────────────────────
const DURATION_OPTIONS = [
  { value: "1 month", label: "1 Month", labelAr: "شهر واحد" },
  { value: "3 months", label: "3 Months", labelAr: "3 أشهر" },
] as const;

// ── Predefined feature catalog (chips) ───────────────────────────────────────
const FEATURE_CATALOG: { en: string; ar: string }[] = [
  { en: "AI-personalized meal plans", ar: "خطط وجبات مخصصة بالذكاء الاصطناعي" },
  { en: "AI-personalized workout plans", ar: "خطط تمارين مخصصة بالذكاء الاصطناعي" },
  { en: "Bi-weekly check-ins with your coach", ar: "متابعة مع المدرب كل أسبوعين" },
  { en: "Daily meal & workout tracking", ar: "تتبع يومي للوجبات والتمارين" },
  { en: "Progress charts & analytics", ar: "رسوم بيانية وتحليلات للتقدم" },
  { en: "Direct coach support via tickets", ar: "دعم مباشر من المدرب عبر التذاكر" },
  { en: "Bilingual app (English & Arabic)", ar: "تطبيق ثنائي اللغة (إنجليزي وعربي)" },
  { en: "Mobile-first PWA — no app store needed", ar: "تطبيق ويب للموبايل — بدون تحميل" },
  { en: "Progress photo tracking", ar: "تتبع صور التقدم" },
  { en: "Personalized dietary preferences", ar: "تفضيلات غذائية مخصصة" },
  { en: "Injury & medical condition support", ar: "دعم الإصابات والحالات الطبية" },
  { en: "Smart schedule-based workout plans", ar: "خطط تمارين ذكية حسب جدولك" },
  { en: "Daily reflection journal", ar: "دفتر تأمل يومي" },
  { en: "Automatic plan regeneration on check-in", ar: "تجديد تلقائي للخطط عند المتابعة" },
  { en: "Push notifications & reminders", ar: "إشعارات وتذكيرات فورية" },
  { en: "FAQ & help center", ar: "الأسئلة الشائعة ومركز المساعدة" },
];

// First 8 features are selected by default; the rest are opt-in
const DEFAULT_SELECTED_COUNT = 8;

const emptyPlan = (): Plan => ({
  id: generateId(),
  name: "",
  nameAr: "",
  price: 0,
  currency: "EGP",
  duration: "1 month",
  durationAr: "شهر واحد",
  features: FEATURE_CATALOG.slice(0, DEFAULT_SELECTED_COUNT).map((f) => f.en),
  featuresAr: FEATURE_CATALOG.slice(0, DEFAULT_SELECTED_COUNT).map((f) => f.ar),
  badge: undefined,
  badgeAr: undefined,
});

export function PlansManager() {
  const t = useTranslations("settings");
  const { isAuthenticated } = useConvexAuth();
  const serverPlans = useQuery(api.systemConfig.getPlans, isAuthenticated ? {} : "skip");
  const updatePlans = useMutation(api.systemConfig.updatePlans);
  const translateAction = useAction(api.ai.translateToArabic);

  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  // Track which AR name fields the coach has manually edited (skip auto-translate for those)
  const manualArEdits = useRef<Set<string>>(new Set());
  // Track which plan names are currently being translated
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  // Debounce timers for translation per plan
  const translateTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const autoTranslateName = useCallback(
    (planId: string, enName: string) => {
      // Clear existing timer for this plan
      const existing = translateTimers.current.get(planId);
      if (existing) clearTimeout(existing);

      if (!enName.trim()) {
        setPlans((prev) => prev?.map((p) => (p.id === planId ? { ...p, nameAr: "" } : p)) ?? null);
        return;
      }

      // Skip if the coach manually edited the AR field
      if (manualArEdits.current.has(planId)) return;

      const timer = setTimeout(async () => {
        setTranslatingIds((prev) => new Set(prev).add(planId));
        try {
          const translated = await translateAction({ text: enName });
          if (translated && !manualArEdits.current.has(planId)) {
            setPlans(
              (prev) =>
                prev?.map((p) => (p.id === planId ? { ...p, nameAr: translated } : p)) ?? null,
            );
          }
        } catch {
          // Silently fail — coach can always type manually
        }
        setTranslatingIds((prev) => {
          const next = new Set(prev);
          next.delete(planId);
          return next;
        });
      }, 800);

      translateTimers.current.set(planId, timer);
    },
    [translateAction],
  );

  // Initialize local state once server data arrives (setState during render is safe if conditional)
  if (serverPlans !== undefined && plans === null) {
    setPlans(serverPlans.length > 0 ? serverPlans : []);
    // Mark loaded plans with existing AR names so auto-translate doesn't overwrite them
    /* eslint-disable react-hooks/refs -- one-time init alongside setState during render */
    for (const p of serverPlans) {
      if (p.nameAr) manualArEdits.current.add(p.id);
    }
    /* eslint-enable react-hooks/refs */
  }

  if (plans === null) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl border border-stone-200 bg-stone-50"
          />
        ))}
      </div>
    );
  }

  const handleAddPlan = () => {
    if (plans.length >= MAX_PLANS) return;
    const newPlan = emptyPlan();
    // Inherit feature selection from the first plan so they stay consistent
    if (plans.length > 0) {
      newPlan.features = [...plans[0].features];
      newPlan.featuresAr = [...plans[0].featuresAr];
    }
    setPlans([...plans, newPlan]);
  };

  const handleRemovePlan = (id: string) => {
    if (confirmRemoveId === id) {
      setPlans(plans.filter((p) => p.id !== id));
      setConfirmRemoveId(null);
    } else {
      setConfirmRemoveId(id);
    }
  };

  const handlePlanChange = <K extends keyof Plan>(id: string, field: K, value: Plan[K]) => {
    setPlans(plans.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleDurationChange = (planId: string, durationValue: string) => {
    const opt = DURATION_OPTIONS.find((o) => o.value === durationValue);
    if (!opt) return;
    setPlans(
      plans.map((p) =>
        p.id === planId ? { ...p, duration: opt.value, durationAr: opt.labelAr } : p,
      ),
    );
  };

  const handleToggleFeature = (planId: string, featureIndex: number) => {
    const feature = FEATURE_CATALOG[featureIndex];
    const sourcePlan = plans.find((p) => p.id === planId);
    if (!sourcePlan) return;
    const isSelected = sourcePlan.features.includes(feature.en);

    // Apply the same toggle to ALL plans
    setPlans(
      plans.map((p) => {
        const idx = p.features.indexOf(feature.en);
        if (isSelected && idx >= 0) {
          return {
            ...p,
            features: p.features.filter((_, i) => i !== idx),
            featuresAr: p.featuresAr.filter((_, i) => i !== idx),
          };
        }
        if (!isSelected && idx < 0) {
          return {
            ...p,
            features: [...p.features, feature.en],
            featuresAr: [...p.featuresAr, feature.ar],
          };
        }
        return p;
      }),
    );
  };

  const handleSave = async () => {
    setValidationError(null);
    const newInvalid = new Set<string>();

    // Validate
    for (const plan of plans) {
      if (!plan.name.trim()) {
        setValidationError(`Plan "${plan.name || "Unnamed"}" requires an English name.`);
        newInvalid.add(`${plan.id}:name`);
      }
      if (plan.price <= 0) {
        if (!validationError) {
          setValidationError(`Plan "${plan.name || "Unnamed"}" must have a price greater than 0.`);
        }
        newInvalid.add(`${plan.id}:price`);
      }
      if (plan.features.length === 0) {
        if (!validationError) {
          setValidationError(`Plan "${plan.name || "Unnamed"}" needs at least one feature.`);
        }
        newInvalid.add(`${plan.id}:features`);
      }
    }
    setInvalidFields(newInvalid);
    if (newInvalid.size > 0) {
      throw new Error("Validation failed");
    }

    try {
      const cleanPlans = plans.map((p) => ({
        ...p,
        badge: p.badge || undefined,
        badgeAr: p.badgeAr || undefined,
      }));
      await updatePlans({ plans: cleanPlans });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: "admin-settings", operation: "update-plans" },
      });
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      {plans.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-200 p-8 text-center">
          <p className="text-sm text-stone-400">No plans yet. Add your first pricing plan.</p>
        </div>
      )}

      {plans.map((plan, planIndex) => (
        <div key={plan.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          {/* Plan header */}
          <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-stone-300" />
              <span className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
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

          <div className="space-y-4 p-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">
                  {t("planName")}
                </label>
                <input
                  type="text"
                  value={plan.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    handlePlanChange(plan.id, "name", val);
                    invalidFields.delete(`${plan.id}:name`);
                    // EN name changed — allow auto-translate again
                    manualArEdits.current.delete(plan.id);
                    autoTranslateName(plan.id, val);
                  }}
                  placeholder={t("planNamePlaceholder")}
                  className={`focus:ring-primary/20 focus:border-primary h-10 w-full rounded-lg border bg-stone-50 px-3 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none ${
                    invalidFields.has(`${plan.id}:name`)
                      ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                      : "border-stone-200"
                  }`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">
                  {t("planNameAr")}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={plan.nameAr}
                    onChange={(e) => {
                      manualArEdits.current.add(plan.id);
                      handlePlanChange(plan.id, "nameAr", e.target.value);
                    }}
                    placeholder={t("planNameArPlaceholder")}
                    dir="rtl"
                    className="focus:ring-primary/20 focus:border-primary h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none"
                  />
                  {translatingIds.has(plan.id) && (
                    <div className="absolute start-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Price & Currency row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-stone-500">
                  {t("price")}
                </label>
                <input
                  type="number"
                  min="0"
                  value={plan.price}
                  onChange={(e) => {
                    handlePlanChange(plan.id, "price", Number(e.target.value));
                    invalidFields.delete(`${plan.id}:price`);
                  }}
                  placeholder={t("pricePlaceholder")}
                  className={`focus:ring-primary/20 focus:border-primary h-10 w-full rounded-lg border bg-stone-50 px-3 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none ${
                    invalidFields.has(`${plan.id}:price`)
                      ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                      : "border-stone-200"
                  }`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">
                  {t("currency")}
                </label>
                <input
                  type="text"
                  value={plan.currency}
                  onChange={(e) => handlePlanChange(plan.id, "currency", e.target.value)}
                  placeholder={t("currencyPlaceholder")}
                  className="focus:ring-primary/20 focus:border-primary h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none"
                />
              </div>
            </div>

            {/* Duration dropdown */}
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">
                {t("duration")}
              </label>
              <select
                value={plan.duration}
                onChange={(e) => handleDurationChange(plan.id, e.target.value)}
                className="focus:ring-primary/20 focus:border-primary h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 transition-all focus:ring-2 focus:outline-none"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} / {opt.labelAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Badge row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">
                  {t("badge")}
                </label>
                <select
                  value={plan.badge ?? ""}
                  onChange={(e) => handlePlanChange(plan.id, "badge", e.target.value || undefined)}
                  className="focus:ring-primary/20 focus:border-primary h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 transition-all focus:ring-2 focus:outline-none"
                >
                  <option value="">{t("noBadge")}</option>
                  <option value="Most Popular">{t("badgeMostPopular")}</option>
                  <option value="Best Value">{t("badgeBestValue")}</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">
                  {t("badgeAr")}
                </label>
                <select
                  value={plan.badgeAr ?? ""}
                  onChange={(e) =>
                    handlePlanChange(plan.id, "badgeAr", e.target.value || undefined)
                  }
                  dir="rtl"
                  className="focus:ring-primary/20 focus:border-primary h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 transition-all focus:ring-2 focus:outline-none"
                >
                  <option value="">{t("noBadge")}</option>
                  <option value="الأكثر شيوعاً">{t("badgeMostPopularAr")}</option>
                  <option value="أفضل قيمة">{t("badgeBestValueAr")}</option>
                </select>
              </div>
            </div>

            {/* Features — selectable chips */}
            <div>
              <label
                className={`mb-2 block text-xs font-medium ${
                  invalidFields.has(`${plan.id}:features`) ? "text-red-500" : "text-stone-500"
                }`}
              >
                {t("features")}
                {invalidFields.has(`${plan.id}:features`) && (
                  <span className="ms-1 font-normal">(at least one required)</span>
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                {FEATURE_CATALOG.map((feat, fi) => {
                  const isSelected = plan.features.includes(feat.en);
                  return (
                    <button
                      key={fi}
                      type="button"
                      onClick={() => handleToggleFeature(plan.id, fi)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-stone-200 bg-stone-50 text-stone-400 hover:border-stone-300 hover:text-stone-600"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      {feat.en}
                    </button>
                  );
                })}
              </div>
              {plan.features.length > 0 && (
                <p className="mt-2 text-[11px] text-stone-400">
                  {plan.features.length} feature{plan.features.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add plan button */}
      {plans.length < MAX_PLANS ? (
        <button
          onClick={handleAddPlan}
          className="hover:border-primary/30 hover:text-primary flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 py-3 text-sm font-medium text-stone-400 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("addPlan")}
        </button>
      ) : (
        <p className="text-center text-xs text-stone-400">{t("maxPlansReached")}</p>
      )}

      {/* Validation error */}
      {validationError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {validationError}
        </p>
      )}

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <SaveButton onSave={handleSave} label={t("savePlans")} />
      </div>
    </div>
  );
}
