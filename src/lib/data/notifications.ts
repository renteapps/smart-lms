import type { AutomationRule } from "@/types/automation";
import type { Notification, NotificationEmailDetails } from "@/types/notification";
import { logQueryError, type DB, type Row } from "./types";

/** Notificação entregue a uma pessoa — o que o sininho mostra. */
export type UserNotification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  link?: string;
  createdAt: string;
};

export async function getMyNotifications(db: DB, userId: string, limit = 50): Promise<UserNotification[]> {
  const { data, error } = await db
    .from("notifications")
    .select("id, title, message, read, type, link, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  logQueryError("getMyNotifications", error);

  return (data ?? []).map((row: Row) => ({
    id: row.id,
    title: row.title,
    message: row.message,
    read: row.read ?? false,
    type: row.type ?? "system",
    link: row.link ?? undefined,
    createdAt: row.created_at,
  }));
}

// ---------------------------------------------------------------------------
// Campanhas (admin)
// ---------------------------------------------------------------------------

export async function getNotificationCampaigns(db: DB): Promise<Notification[]> {
  const { data, error } = await db
    .from("notification_campaigns")
    .select("id, title, message, target_audience, target_id, channels, email_details, views, opens, clicks, created_at")
    .order("created_at", { ascending: false });

  logQueryError("getNotificationCampaigns", error);

  return (data ?? []).map((row: Row) => ({
    id: row.id,
    title: row.title,
    message: row.message,
    createdAt: row.created_at,
    read: true,
    targetAudience: row.target_audience as Notification["targetAudience"],
    targetId: row.target_id ?? undefined,
    channels: (row.channels ?? ["platform"]) as Notification["channels"],
    emailDetails: (row.email_details ?? undefined) as NotificationEmailDetails | undefined,
    stats: { views: row.views ?? 0, opens: row.opens ?? 0, clicks: row.clicks ?? 0 },
  }));
}

export async function getAutomations(db: DB): Promise<AutomationRule[]> {
  const { data, error } = await db
    .from("automations")
    .select(
      "id, name, trigger_type, trigger_days, trigger_course_id, action_title, action_message, channels, email_details, status, triggered_count, views, opens, clicks, created_at",
    )
    .order("created_at", { ascending: false });

  logQueryError("getAutomations", error);

  return (data ?? []).map((row: Row) => ({
    id: row.id,
    name: row.name,
    trigger: {
      type: row.trigger_type as AutomationRule["trigger"]["type"],
      days: row.trigger_days ?? 0,
      courseId: row.trigger_course_id ?? undefined,
    },
    action: {
      title: row.action_title,
      message: row.action_message,
      channels: (row.channels ?? ["platform"]) as AutomationRule["action"]["channels"],
      emailDetails: (row.email_details ?? undefined) as NotificationEmailDetails | undefined,
    },
    status: (row.status ?? "active") as AutomationRule["status"],
    stats: {
      triggeredCount: row.triggered_count ?? 0,
      views: row.views ?? 0,
      opens: row.opens ?? 0,
      clicks: row.clicks ?? 0,
    },
    createdAt: row.created_at,
  }));
}
