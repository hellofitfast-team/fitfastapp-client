"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@fitfast/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useConvexAuth, useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { createLogger } from "@fitfast/config/logger";

const log = createLogger("admin-client-detail");
import {
  User,
  Calendar,
  TrendingUp,
  ArrowLeft,
  Loader2,
  Check,
  X,
  XCircle,
  Zap,
  CreditCard,
  Clock,
  MinusCircle,
  Bell,
  Send,
} from "lucide-react";
import { Link } from "@fitfast/i18n/navigation";
import { formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { PaymentScreenshot } from "@/components/payment-screenshot";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@fitfast/ui/dialog";

const tierOptions = [
  { value: "monthly" as const, months: 1 },
  { value: "quarterly" as const, months: 3 },
];

// PaymentScreenshot imported from shared component

/** OCR-extracted payment data from a signup screenshot */
interface OcrExtractedData {
  reference_number?: string;
  amount?: string;
  sender_name?: string;
  bank?: string;
}

/** Signup record from the pendingSignups table */
interface SignupRecord {
  _id: string;
  _creationTime: number;
  status: "pending" | "approved" | "rejected";
  planTier?: string;
  paymentScreenshotId?: string;
  ocrExtractedData?: OcrExtractedData;
}

const statusBadge: Record<string, string> = {
  pending: "bg-primary/10 text-primary border-primary/20",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

function SignupPaymentCard({ signup }: { signup: SignupRecord }) {
  const t = useTranslations("admin");
  const ocr = signup.ocrExtractedData;

  return (
    <div className="rounded-lg border border-stone-100 bg-stone-50/50 p-4">
      {/* Header row: status + date */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            statusBadge[signup.status] ?? statusBadge.pending
          }`}
        >
          {signup.status === "pending" && <Clock className="h-3 w-3" />}
          {signup.status === "approved" && <Check className="h-3 w-3" />}
          {signup.status === "rejected" && <X className="h-3 w-3" />}
          {t(`clientDetail.paymentStatus.${signup.status}`)}
        </span>
        <span className="text-xs text-stone-400">
          {new Date(signup._creationTime).toLocaleDateString()}
        </span>
      </div>

      <div className="flex gap-4">
        {/* Screenshot */}
        {signup.paymentScreenshotId ? (
          <div className="w-36 shrink-0">
            <PaymentScreenshot storageId={signup.paymentScreenshotId as Id<"_storage">} />
          </div>
        ) : (
          <div className="w-36 shrink-0">
            <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-stone-200 bg-white">
              <p className="text-xs text-stone-400">{t("clientDetail.noScreenshot")}</p>
            </div>
          </div>
        )}

        {/* Details */}
        <dl className="min-w-0 flex-1 space-y-1.5 text-sm">
          {signup.planTier && (
            <div className="flex justify-between">
              <dt className="text-stone-500">{t("clientDetail.plan")}</dt>
              <dd className="text-primary font-medium">{signup.planTier.replace("_", " ")}</dd>
            </div>
          )}
          {ocr?.reference_number && (
            <div className="flex justify-between">
              <dt className="text-stone-500">{t("clientDetail.referenceNumber")}</dt>
              <dd className="font-mono font-medium text-stone-900">{ocr.reference_number}</dd>
            </div>
          )}
          {ocr?.amount && (
            <div className="flex justify-between">
              <dt className="text-stone-500">{t("clientDetail.amount")}</dt>
              <dd className="font-medium text-stone-900">{ocr.amount}</dd>
            </div>
          )}
          {ocr?.sender_name && (
            <div className="flex justify-between">
              <dt className="text-stone-500">{t("clientDetail.sender")}</dt>
              <dd className="text-stone-900">{ocr.sender_name}</dd>
            </div>
          )}
          {ocr?.bank && (
            <div className="flex justify-between">
              <dt className="text-stone-500">{t("clientDetail.bank")}</dt>
              <dd className="text-stone-900">{ocr.bank}</dd>
            </div>
          )}
          {!ocr && !signup.paymentScreenshotId && (
            <p className="text-xs text-stone-400">{t("clientDetail.noPaymentDetails")}</p>
          )}
        </dl>
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const t = useTranslations("admin");
  const locale = useLocale();
  const { isAuthenticated } = useConvexAuth();

  const profile = useQuery(
    api.profiles.getProfileByUserId,
    isAuthenticated
      ? {
          userId: userId,
        }
      : "skip",
  );
  const assessment = useQuery(
    api.assessments.getAssessmentByUserId,
    isAuthenticated
      ? {
          userId: userId,
        }
      : "skip",
  );

  // Fetch all signup records (payment history) by email
  const signups = useQuery(
    api.pendingSignups.getSignupsByEmail,
    isAuthenticated && profile?.email ? { email: profile.email } : "skip",
  );
  // Latest signup (for pre-selecting plan tier)
  const latestSignup = signups?.[0] ?? null;

  const tNotif = useTranslations("notifications");
  const router = useRouter();
  const updateStatus = useMutation(api.profiles.updateClientStatus);
  const rejectClient = useMutation(api.profiles.rejectClient);
  const sendNotification = useAction(api.adminNotifications.sendToIndividual);

  const [selectedTier, setSelectedTier] = useState<"monthly" | "quarterly">("monthly");
  const [isActing, setIsActing] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Pre-select the plan tier from the latest signup if available (coach can override)
  const initialTier = latestSignup?.planTier as "monthly" | "quarterly" | undefined;
  const [tierOverridden, setTierOverridden] = useState(false);
  const effectiveTier = tierOverridden ? selectedTier : (initialTier ?? selectedTier);

  const [showNotifDialog, setShowNotifDialog] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  const [now] = useState(() => Date.now());
  const isLoading = profile === undefined || assessment === undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <Link
          href="/clients"
          className="hover:border-primary/30 hover:text-primary flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 text-stone-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Link>
        <p className="text-sm text-stone-500">{t("clientNotFound")}</p>
      </div>
    );
  }

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) return;
    setIsSendingNotif(true);
    try {
      await sendNotification({
        userId,
        title: notifTitle.trim(),
        body: notifBody.trim(),
      });
      toast({
        title: tNotif("sent"),
        description: tNotif("sentDesc"),
        variant: "success",
      });
      setShowNotifDialog(false);
      setNotifTitle("");
      setNotifBody("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      toast({
        title: tNotif("sendFailed"),
        description: message.includes("disabled")
          ? tNotif("notificationsDisabled")
          : tNotif("sendFailedDesc"),
        variant: "destructive",
      });
    }
    setIsSendingNotif(false);
  };

  const handleActivate = async () => {
    setIsActing(true);
    try {
      const tier = tierOptions.find((opt) => opt.value === effectiveTier)!;
      const startDate = new Date().toISOString().split("T")[0];
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + tier.months);

      await updateStatus({
        profileId: profile._id as Id<"profiles">,
        status: "active",
        planTier: effectiveTier,
        planStartDate: startDate,
        planEndDate: endDate.toISOString().split("T")[0],
      });

      toast({
        title: t("clientDetail.activated"),
        description: `${profile.fullName} — ${t(`tierLabels.${effectiveTier}`)}`,
        variant: "success",
      });
    } catch (err) {
      log.error({ err, profileId: profile._id, tier: effectiveTier }, "Client activation failed");
      toast({
        title: t("clientDetail.activateFailed"),
        description: err instanceof Error ? err.message : t("clientDetail.activateFailed"),
        variant: "destructive",
      });
    }
    setIsActing(false);
  };

  const handleDeactivate = async () => {
    setIsActing(true);
    try {
      await updateStatus({
        profileId: profile._id as Id<"profiles">,
        status: "inactive",
      });
      toast({
        title: t("clientDetail.deactivated"),
        description: profile.fullName ?? "",
        variant: "success",
      });
    } catch (err) {
      log.error({ err, profileId: profile._id }, "Client deactivation failed");
      toast({
        title: t("clientDetail.deactivateFailed"),
        description: err instanceof Error ? err.message : t("clientDetail.deactivateFailed"),
        variant: "destructive",
      });
    }
    setIsActing(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    setIsActing(true);
    try {
      await rejectClient({
        profileId: profile._id as Id<"profiles">,
        rejectionReason: rejectionReason.trim(),
      });
      toast({
        title: t("clientDetail.rejected"),
        description: profile.fullName ?? "",
        variant: "success",
      });
      router.replace("/clients");
    } catch (err) {
      log.error({ err, profileId: profile._id }, "Client rejection failed");
      toast({
        title: t("clientDetail.rejectFailed"),
        description: err instanceof Error ? err.message : t("clientDetail.rejectFailed"),
        variant: "destructive",
      });
    }
    setIsActing(false);
  };

  const statusColor =
    profile.status === "active"
      ? "text-emerald-600"
      : profile.status === "pending_approval"
        ? "text-primary"
        : profile.status === "expired"
          ? "text-red-600"
          : "text-stone-500";

  return (
    <div className="space-y-6">
      {/* Back button + name + actions */}
      <div className="flex items-center gap-4">
        <Link
          href="/clients"
          className="hover:border-primary/30 hover:text-primary flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 text-stone-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            {profile.fullName ?? t("client")}
          </h1>
          <p className="mt-0.5 text-xs text-stone-400">ID: {userId.slice(0, 8)}...</p>
        </div>
        {profile.status === "active" && (
          <button
            onClick={() => setShowNotifDialog(true)}
            className="hover:border-primary/30 hover:text-primary flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-500 transition-colors"
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">{t("clientDetail.sendNotification")}</span>
          </button>
        )}
      </div>

      {/* Send Notification Dialog */}
      <Dialog
        open={showNotifDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowNotifDialog(false);
            setNotifTitle("");
            setNotifBody("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold text-stone-900">
                  {tNotif("sendToClient")}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs text-stone-400">
                  {profile.fullName ?? ""}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="notif-title"
                className="mb-1 block text-xs font-medium text-stone-500"
              >
                {tNotif("notificationTitle")}
              </label>
              <input
                id="notif-title"
                type="text"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder={tNotif("titlePlaceholder")}
                maxLength={50}
                className="focus:ring-primary/20 focus:border-primary h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none"
                autoFocus
              />
              <span className="mt-1 block text-end text-xs text-stone-400">
                {notifTitle.length}/50
              </span>
            </div>
            <div>
              <label htmlFor="notif-body" className="mb-1 block text-xs font-medium text-stone-500">
                {tNotif("notificationBody")}
              </label>
              <textarea
                id="notif-body"
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                placeholder={tNotif("bodyPlaceholder")}
                rows={3}
                maxLength={150}
                className="focus:ring-primary/20 focus:border-primary w-full resize-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none"
              />
              <span className="mt-1 block text-end text-xs text-stone-400">
                {notifBody.length}/150
              </span>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => {
                setShowNotifDialog(false);
                setNotifTitle("");
                setNotifBody("");
              }}
              disabled={isSendingNotif}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50"
            >
              {tNotif("cancelSend")}
            </button>
            <button
              onClick={handleSendNotification}
              disabled={isSendingNotif || !notifTitle.trim() || !notifBody.trim()}
              className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            >
              {isSendingNotif ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSendingNotif ? tNotif("sending") : tNotif("confirmSend")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Profile */}
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <User className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-stone-900">{t("clientDetail.profile")}</h2>
          </div>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">{t("clientDetail.status")}</dt>
              <dd className={`font-medium ${statusColor}`}>{profile.status?.replace("_", " ")}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">{t("clientDetail.plan")}</dt>
              <dd className="font-medium text-stone-900">
                {profile.planTier ? t(`tierLabels.${profile.planTier}`) : "---"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">{t("clientDetail.phone")}</dt>
              <dd className="text-stone-900">{profile.phone ?? "---"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">{t("clientDetail.language")}</dt>
              <dd className="text-stone-900 uppercase">{profile.language ?? "en"}</dd>
            </div>
          </dl>
        </div>

        {/* Plan dates */}
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <Calendar className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-stone-900">{t("clientDetail.planPeriod")}</h2>
          </div>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">{t("clientDetail.start")}</dt>
              <dd className="text-stone-900">
                {profile.planStartDate ? formatDate(profile.planStartDate, locale) : "---"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">{t("clientDetail.end")}</dt>
              <dd className="text-stone-900">
                {profile.planEndDate ? formatDate(profile.planEndDate, locale) : "---"}
              </dd>
            </div>
            {profile.planEndDate && (
              <div className="flex justify-between">
                <dt className="text-stone-500">{t("clientDetail.remaining")}</dt>
                <dd className="text-primary font-medium">
                  {Math.max(
                    0,
                    Math.ceil(
                      (new Date(profile.planEndDate).getTime() - now) / (1000 * 60 * 60 * 24),
                    ),
                  )}{" "}
                  {t("clientDetail.days")}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Assessment summary */}
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-stone-900">{t("clientDetail.assessment")}</h2>
          </div>
          {assessment ? (
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500">{t("clientDetail.weight")}</dt>
                <dd className="text-stone-900">{assessment.currentWeight ?? "---"} kg</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">{t("clientDetail.height")}</dt>
                <dd className="text-stone-900">{assessment.height ?? "---"} cm</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">{t("clientDetail.level")}</dt>
                <dd className="text-stone-900 capitalize">{assessment.experienceLevel ?? "---"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">{t("clientDetail.goals")}</dt>
                <dd className="max-w-[120px] truncate text-stone-900">
                  {assessment.goals ?? "---"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-stone-400">{t("clientDetail.noAssessment")}</p>
          )}
        </div>

        {/* Payment history — shown for all clients */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <CreditCard className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-stone-900">
              {t("clientDetail.paymentHistory")}
            </h2>
          </div>

          {!profile.email && <p className="text-sm text-stone-400">{t("clientDetail.noEmail")}</p>}

          {profile.email && signups === undefined && (
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("clientDetail.loadingPayments")}
            </div>
          )}

          {profile.email && signups && signups.length === 0 && (
            <p className="text-sm text-stone-400">{t("clientDetail.noPayments")}</p>
          )}

          {signups && signups.length > 0 && (
            <div className="space-y-4">
              {signups.map((s) => (
                <SignupPaymentCard key={s._id} signup={s} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions card */}
      {profile.status === "pending_approval" && (
        <div className="border-primary/20 bg-primary/5 rounded-xl border-2 p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <Zap className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-stone-900">
              {t("clientDetail.activateClient")}
            </h2>
          </div>

          <p className="mb-4 text-sm text-stone-600">
            {t("clientDetail.activateDesc")}
            {latestSignup?.planTier && (
              <span className="mt-1 block text-xs text-stone-400">
                Client requested: {t(`tierLabels.${latestSignup.planTier}`)} — you can override
                below.
              </span>
            )}
          </p>

          <div className="flex flex-wrap items-end gap-3">
            {/* Plan tier selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500">
                {t("clientDetail.planTier")}
              </label>
              <div className="flex gap-2">
                {tierOptions.map((tier) => (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => {
                      setSelectedTier(tier.value);
                      setTierOverridden(true);
                    }}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      effectiveTier === tier.value
                        ? "border-primary bg-primary text-white"
                        : "hover:border-primary/40 border-stone-200 bg-white text-stone-700"
                    }`}
                  >
                    {t(`tierLabels.${tier.value}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Activate button */}
            <button
              onClick={handleActivate}
              disabled={isActing}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {isActing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {t("clientDetail.activate")}
            </button>

            {/* Reject toggle */}
            {!isRejecting && (
              <button
                onClick={() => setIsRejecting(true)}
                disabled={isActing}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                {t("clientDetail.reject")}
              </button>
            )}
          </div>

          {/* Rejection reason input */}
          {isRejecting && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50/50 p-4">
              <p className="mb-2 text-xs font-medium text-stone-600">
                {t("clientDetail.rejectionReason")}
              </p>
              <div className="flex items-start gap-3">
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={t("clientDetail.rejectionPlaceholder")}
                  rows={2}
                  className="flex-1 resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:border-red-300 focus:ring-2 focus:ring-red-200 focus:outline-none"
                  autoFocus
                />
                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    onClick={handleReject}
                    disabled={isActing || !rejectionReason.trim()}
                    className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {isActing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                    {t("clientDetail.confirmReject")}
                  </button>
                  <button
                    onClick={() => {
                      setIsRejecting(false);
                      setRejectionReason("");
                    }}
                    disabled={isActing}
                    className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Deactivate for active/expired clients */}
      {(profile.status === "active" || profile.status === "expired") && (
        <div className="flex justify-end">
          <button
            onClick={handleDeactivate}
            disabled={isActing}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            {isActing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            {t("clientDetail.deactivateClient")}
          </button>
        </div>
      )}
    </div>
  );
}
