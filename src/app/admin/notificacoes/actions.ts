"use server";

import { createClient } from "@/lib/supabase/server";

export async function getNotificationCampaigns() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notification campaigns:", error);
    return [];
  }

  return data;
}

export async function createNotificationCampaign(campaignData: any) {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  const { data, error } = await supabase
    .from("notification_campaigns")
    .insert([
      {
        title: campaignData.title,
        message: campaignData.message,
        target_audience: campaignData.targetAudience,
        target_id: campaignData.targetId,
        channels: campaignData.channels,
        email_details: campaignData.emailDetails,
        views: 0,
        opens: 0,
        clicks: 0,
        created_by: userId || null,
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Error creating notification campaign:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function deleteNotificationCampaign(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_campaigns")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting notification campaign:", error);
    throw new Error(error.message);
  }
}

export async function getAutomations() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching automations:", error);
    return [];
  }
  return data;
}

export async function createAutomation(automationData: any) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("automations")
    .insert([{
      name: automationData.name,
      trigger_type: automationData.trigger.type,
      trigger_days: automationData.trigger.days,
      trigger_course_id: automationData.trigger.courseId || null,
      action_title: automationData.action.title,
      action_message: automationData.action.message,
      channels: automationData.action.channels,
      email_details: automationData.action.emailDetails || null,
      status: "active",
      triggered_count: 0,
      views: 0,
      opens: 0,
      clicks: 0
    }])
    .select("*")
    .single();

  if (error) {
    console.error("Error creating automation:", error);
    throw new Error(error.message);
  }
  return data;
}

export async function deleteAutomation(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("automations").delete().eq("id", id);
  if (error) {
    console.error("Error deleting automation:", error);
    throw new Error(error.message);
  }
}

export async function toggleAutomationStatus(id: string, currentStatus: string) {
  const supabase = await createClient();
  const newStatus = currentStatus === "active" ? "paused" : "active";
  const { data, error } = await supabase
    .from("automations")
    .update({ status: newStatus })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error toggling automation:", error);
    throw new Error(error.message);
  }
  return data;
}
