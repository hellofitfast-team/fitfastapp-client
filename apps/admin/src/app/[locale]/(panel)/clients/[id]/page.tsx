"use client";

import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  User,
  Calendar,
  TrendingUp,
  ClipboardCheck,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Link } from "@fitfast/i18n/navigation";
import { formatDate } from "@/lib/utils";

export default function ClientDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const t = useTranslations("admin");
  const locale = useLocale();

  const profile = useQuery(api.profiles.getProfileByUserId, {
    userId: userId,
  });
  const assessment = useQuery(api.assessments.getAssessmentByUserId, {
    userId: userId,
  });

  const isLoading = profile === undefined || assessment === undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <Link
          href="/clients"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:border-primary/30 hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Link>
        <p className="text-sm text-stone-500">Client not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button + name */}
      <div className="flex items-center gap-4">
        <Link
          href="/clients"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:border-primary/30 hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            {profile.fullName ?? "Client"}
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            ID: {userId.slice(0, 8)}...
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Profile */}
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </div>
            <h2 className="font-semibold text-sm text-stone-900">
              Profile
            </h2>
          </div>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">Status</dt>
              <dd className="font-medium text-emerald-600">
                {profile.status?.replace("_", " ")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Plan</dt>
              <dd className="font-medium text-stone-900">{profile.planTier ?? "---"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Phone</dt>
              <dd className="text-stone-900">{profile.phone ?? "---"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Language</dt>
              <dd className="text-stone-900 uppercase">{profile.language ?? "en"}</dd>
            </div>
          </dl>
        </div>

        {/* Plan dates */}
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </div>
            <h2 className="font-semibold text-sm text-stone-900">
              Plan Period
            </h2>
          </div>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">Start</dt>
              <dd className="text-stone-900">
                {profile.planStartDate
                  ? formatDate(profile.planStartDate, locale)
                  : "---"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">End</dt>
              <dd className="text-stone-900">
                {profile.planEndDate
                  ? formatDate(profile.planEndDate, locale)
                  : "---"}
              </dd>
            </div>
            {profile.planEndDate && (
              <div className="flex justify-between">
                <dt className="text-stone-500">Remaining</dt>
                <dd className="font-medium text-primary">
                  {Math.max(
                    0,
                    Math.ceil(
                      (new Date(profile.planEndDate).getTime() -
                        Date.now()) /
                        (1000 * 60 * 60 * 24)
                    )
                  )}{" "}
                  days
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Assessment summary */}
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h2 className="font-semibold text-sm text-stone-900">
              Assessment
            </h2>
          </div>
          {assessment ? (
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500">Weight</dt>
                <dd className="text-stone-900">{assessment.currentWeight ?? "---"} kg</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Height</dt>
                <dd className="text-stone-900">{assessment.height ?? "---"} cm</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Level</dt>
                <dd className="text-stone-900 capitalize">
                  {assessment.experienceLevel ?? "---"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Goals</dt>
                <dd className="truncate max-w-[120px] text-stone-900">
                  {assessment.goals ?? "---"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-stone-400">
              No assessment submitted
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
