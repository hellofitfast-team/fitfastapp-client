import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Profile, InitialAssessment, CheckIn } from "@/types/database";
import {
  User,
  Calendar,
  TrendingUp,
  ClipboardCheck,
  ArrowLeft,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const supabase = await createClient();

  const [profileRes, assessmentRes, checkInsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select()
      .eq("id", id)
      .single<Profile>(),
    supabase
      .from("initial_assessments")
      .select()
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<InitialAssessment>(),
    supabase
      .from("check_ins")
      .select()
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<CheckIn[]>(),
  ]);

  if (!profileRes.data) return notFound();
  const profile = profileRes.data;
  const assessment = assessmentRes.data;
  const checkIns = checkInsRes.data ?? [];

  return (
    <div className="space-y-6">
      {/* Back button + name */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/clients"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:border-primary/30 hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            {profile.full_name ?? "Client"}
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            ID: {id.slice(0, 8)}...
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
              <dd className="font-medium text-stone-900">{profile.plan_tier ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Phone</dt>
              <dd className="text-stone-900">{profile.phone ?? "—"}</dd>
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
                {profile.plan_start_date
                  ? formatDate(profile.plan_start_date, locale)
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">End</dt>
              <dd className="text-stone-900">
                {profile.plan_end_date
                  ? formatDate(profile.plan_end_date, locale)
                  : "—"}
              </dd>
            </div>
            {profile.plan_end_date && (
              <div className="flex justify-between">
                <dt className="text-stone-500">Remaining</dt>
                <dd className="font-medium text-primary">
                  {Math.max(
                    0,
                    Math.ceil(
                      (new Date(profile.plan_end_date).getTime() -
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
                <dd className="text-stone-900">{assessment.current_weight ?? "—"} kg</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Height</dt>
                <dd className="text-stone-900">{assessment.height ?? "—"} cm</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Level</dt>
                <dd className="text-stone-900 capitalize">
                  {assessment.experience_level ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Goals</dt>
                <dd className="truncate max-w-[120px] text-stone-900">
                  {assessment.goals ?? "—"}
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

      {/* Recent check-ins */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <h2 className="font-semibold text-sm text-stone-900">
            Recent Check-ins ({checkIns.length})
          </h2>
        </div>
        {checkIns.length === 0 ? (
          <p className="text-sm text-stone-400">
            No check-ins yet
          </p>
        ) : (
          <div className="space-y-3">
            {checkIns.map((ci) => (
              <div
                key={ci.id}
                className="flex items-center justify-between border-b border-stone-100 pb-3 last:border-0"
              >
                <div className="text-sm">
                  <span className="text-stone-500">
                    {formatDate(ci.created_at, locale)}
                  </span>
                  {ci.weight && (
                    <span className="ms-4 font-medium text-stone-900">{ci.weight} kg</span>
                  )}
                </div>
                <div className="flex gap-4 text-sm text-stone-500">
                  {ci.energy_level && <span>Energy: {ci.energy_level}/10</span>}
                  {ci.sleep_quality && <span>Sleep: {ci.sleep_quality}/10</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
