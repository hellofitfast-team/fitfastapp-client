"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useConvexAuth, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell, Send, Loader2, BellOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "@fitfast/i18n/navigation";

const typeBadgeColors: Record<string, string> = {
  plan_ready: "bg-blue-50 text-blue-700 border-blue-200",
  reminder: "bg-amber-50 text-amber-700 border-amber-200",
  broadcast: "bg-purple-50 text-purple-700 border-purple-200",
  individual: "bg-teal-50 text-teal-700 border-teal-200",
};

const statusBadgeColors: Record<string, string> = {
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
};

const PAGE_SIZE = 10;

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const tAdmin = useTranslations("admin");
  const locale = useLocale();
  const { isAuthenticated } = useConvexAuth();

  const tSettings = useTranslations("settings");

  const notifConfig = useQuery(
    api.systemConfig.getConfig,
    isAuthenticated ? { key: "notifications_enabled" } : "skip",
  );
  const isNotifEnabled = notifConfig === undefined ? undefined : notifConfig?.value !== false;

  const logs = useQuery(api.notificationLog.getNotificationLogs, isAuthenticated ? {} : "skip");

  const broadcastAction = useAction(api.adminNotifications.broadcastToAllActive);

  const [page, setPage] = useState(1);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-focus confirm button when confirmation appears
  useEffect(() => {
    if (showConfirm) confirmBtnRef.current?.focus();
  }, [showConfirm]);

  // Reset page to 1 when logs change (avoid setState in useEffect)
  const prevLogsLengthRef = useRef(logs?.length);
  if (logs?.length !== prevLogsLengthRef.current) {
    prevLogsLengthRef.current = logs?.length;
    if (page !== 1) setPage(1);
  }

  // Pagination
  const totalPages = Math.ceil((logs?.length ?? 0) / PAGE_SIZE);
  const paginatedLogs = logs?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleBroadcast = async () => {
    if (!title.trim() || !body.trim()) return;
    setIsSending(true);
    setShowConfirm(false);
    try {
      const result = await broadcastAction({ title: title.trim(), body: body.trim() });
      toast({
        title: t("broadcastSent"),
        description: t("broadcastSentDesc", { sent: result.sent, failed: result.failed }),
        variant: "success",
      });
      setTitle("");
      setBody("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      toast({
        title: t("sendFailed"),
        description: message.includes("disabled")
          ? t("notificationsDisabled")
          : t("sendFailedDesc"),
        variant: "destructive",
      });
    }
    setIsSending(false);
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">{t("title")}</h1>
      </div>

      <div className="max-w-3xl space-y-8">
        {/* Disabled banner */}
        {isNotifEnabled === false && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <BellOff className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-stone-900">{t("notificationsDisabled")}</p>
            </div>
            <Link
              href="/settings"
              className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50"
            >
              {tSettings("pushNotifications")}
            </Link>
          </div>
        )}

        {/* Broadcast card */}
        <div
          className={`rounded-xl border border-stone-200 bg-white p-6${isNotifEnabled === false ? "pointer-events-none opacity-50" : ""}`}
          aria-disabled={isNotifEnabled === false}
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900">{t("broadcast")}</h2>
              <p className="mt-0.5 text-xs text-stone-400">{t("broadcastDesc")}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="broadcast-title"
                className="mb-1 block text-xs font-medium text-stone-500"
              >
                {t("notificationTitle")}
              </label>
              <input
                id="broadcast-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
                maxLength={50}
                disabled={isNotifEnabled === false}
                className="focus:ring-primary/20 focus:border-primary h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none"
              />
              <span className="mt-1 block text-end text-xs text-stone-400">{title.length}/50</span>
            </div>
            <div>
              <label
                htmlFor="broadcast-body"
                className="mb-1 block text-xs font-medium text-stone-500"
              >
                {t("notificationBody")}
              </label>
              <textarea
                id="broadcast-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("bodyPlaceholder")}
                rows={3}
                maxLength={150}
                disabled={isNotifEnabled === false}
                className="focus:ring-primary/20 focus:border-primary w-full resize-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:ring-2 focus:outline-none"
              />
              <span className="mt-1 block text-end text-xs text-stone-400">{body.length}/150</span>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowConfirm(true)}
                disabled={isNotifEnabled === false || isSending || !title.trim() || !body.trim()}
                className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isSending ? t("sending") : t("sendToAll")}
              </button>
            </div>
          </div>

          {/* Confirmation dialog */}
          {showConfirm && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <p className="mb-1 text-sm font-medium text-stone-900">{t("confirmBroadcast")}</p>
              <p className="mb-3 text-xs text-stone-500">{t("confirmBroadcastDesc")}</p>
              <div className="flex gap-2">
                <button
                  ref={confirmBtnRef}
                  onClick={handleBroadcast}
                  className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  {t("confirmSend")}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                >
                  {t("cancelSend")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* History */}
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <Bell className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-stone-900">{t("history")}</h2>
          </div>

          {logs === undefined && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-primary h-6 w-6 animate-spin" />
            </div>
          )}

          {logs && logs.length === 0 && (
            <p className="py-4 text-center text-sm text-stone-400">{t("historyEmpty")}</p>
          )}

          {logs && logs.length > 0 && (
            <>
              {/* Mobile card layout */}
              <div className="space-y-3 sm:hidden">
                {paginatedLogs?.map((log) => (
                  <div
                    key={log._id}
                    className="space-y-2 rounded-lg border border-stone-100 bg-stone-50/50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          typeBadgeColors[log.type] ?? "border-stone-200 bg-stone-50 text-stone-600"
                        }`}
                      >
                        {t(`typeLabels.${log.type}`)}
                      </span>
                      <span className="shrink-0 text-xs text-stone-400">
                        {new Date(log.sentAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="truncate text-xs font-medium text-stone-700">{log.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-500">
                        {t("recipients")}: {log.recipientCount}
                        {log.failedCount ? (
                          <span className="text-red-500"> (+{log.failedCount} failed)</span>
                        ) : null}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          statusBadgeColors[log.status] ??
                          "border-stone-200 bg-stone-50 text-stone-600"
                        }`}
                      >
                        {t(`statusLabels.${log.status}`)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table layout */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 text-start text-xs font-medium text-stone-400">
                      <th scope="col" className="pe-4 pb-2 text-start font-medium">
                        {t("date")}
                      </th>
                      <th scope="col" className="pe-4 pb-2 text-start font-medium">
                        {t("type")}
                      </th>
                      <th scope="col" className="pe-4 pb-2 text-start font-medium">
                        {t("notificationTitle")}
                      </th>
                      <th scope="col" className="pe-4 pb-2 text-start font-medium">
                        {t("recipients")}
                      </th>
                      <th scope="col" className="pb-2 text-start font-medium">
                        {t("statusLabel")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {paginatedLogs?.map((log) => (
                      <tr key={log._id} className="text-stone-700">
                        <td className="py-2.5 pe-4 text-xs text-stone-500">
                          {new Date(log.sentAt).toLocaleString(
                            locale === "ar" ? "ar-EG" : "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </td>
                        <td className="py-2.5 pe-4">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                              typeBadgeColors[log.type] ??
                              "border-stone-200 bg-stone-50 text-stone-600"
                            }`}
                          >
                            {t(`typeLabels.${log.type}`)}
                          </span>
                        </td>
                        <td className="max-w-[200px] truncate py-2.5 pe-4 text-xs">{log.title}</td>
                        <td className="py-2.5 pe-4 text-xs">
                          {log.recipientCount}
                          {log.failedCount ? (
                            <span className="text-red-500"> (+{log.failedCount} failed)</span>
                          ) : null}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                              statusBadgeColors[log.status] ??
                              "border-stone-200 bg-stone-50 text-stone-600"
                            }`}
                          >
                            {t(`statusLabels.${log.status}`)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {logs && logs.length > 0 && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
              <p className="text-xs text-stone-400">
                {tAdmin("showing")} {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, logs.length)} {tAdmin("of")} {logs.length}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40"
                >
                  {tAdmin("previous")}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40"
                >
                  {tAdmin("next")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
