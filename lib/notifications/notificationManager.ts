/**
 * Sales Pilot — Notification Manager
 * 
 * Provides an extensible notification dispatcher for human handover events.
 * Currently delivers in-app real-time alerts via Supabase Realtime, with
 * an architecture ready to support Email, SMS, WhatsApp, and Slack providers.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface HandoverNotificationPayload {
  conversationId: string | number;
  profileId: string;
  customerName?: string | null;
  customerEmail?: string | null;
  reason?: string | null;
  requestedAt?: string;
  lastMessage?: string | null;
}

export interface NotificationProvider {
  name: string;
  sendHandoverAlert(payload: HandoverNotificationPayload): Promise<boolean>;
}

// In-App Realtime Notification Provider
class InAppRealtimeNotificationProvider implements NotificationProvider {
  name = "in_app_realtime";

  async sendHandoverAlert(payload: HandoverNotificationPayload): Promise<boolean> {
    // In-app notifications are primarily driven by Supabase Realtime database changes
    // (INSERT on conversation_messages and UPDATE on conversations) which active
    // staff consoles subscribe to. We log this audit trail for observability.
    console.log(
      `[NotificationManager] Handover alert dispatched for conversation #${payload.conversationId} (Merchant: ${payload.profileId}, Reason: ${payload.reason || "Customer requested human"})`
    );
    return true;
  }
}

// Registry of notification providers
const registeredProviders: NotificationProvider[] = [
  new InAppRealtimeNotificationProvider(),
];

/**
 * Dispatches a human handover alert to all registered notification providers.
 */
export async function notifyHumanHandover(
  payload: HandoverNotificationPayload,
  supabase?: SupabaseClient
): Promise<void> {
  const promises = registeredProviders.map(async (provider) => {
    try {
      await provider.sendHandoverAlert(payload);
    } catch (err) {
      console.error(`[NotificationManager] Provider ${provider.name} failed:`, err);
    }
  });

  await Promise.allSettled(promises);
}

/**
 * Register additional notification providers (e.g. Slack, Email, WhatsApp)
 */
export function registerNotificationProvider(provider: NotificationProvider): void {
  registeredProviders.push(provider);
}

