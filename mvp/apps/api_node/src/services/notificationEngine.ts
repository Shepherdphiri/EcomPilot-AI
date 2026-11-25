import { supabaseAdmin } from '../config/clients.js';
import { sendDailyMorningReportEmail, sendOperationalEmail } from './emailService.js';
import { sendWhatsAppAlert } from './whatsappService.js';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_WEIGHT: Record<AlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export async function dispatchAlertNotification(params: {
  workspaceId: string;
  severity: AlertSeverity;
  dedupKey: string;
  title: string;
  body: string;
}) {
  const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const { data: existing } = await supabaseAdmin
    .from('notifications')
    .select('id')
    .eq('workspace_id', params.workspaceId)
    .eq('dedup_key', params.dedupKey)
    .gte('created_at', sixHoursAgo)
    .limit(1);

  if (existing && existing.length > 0) {
    return { skipped: true, reason: 'deduplicated' };
  }

  const { data: prefs } = await supabaseAdmin
    .from('notification_preferences')
    .select('user_id, email_enabled, whatsapp_enabled, whatsapp_phone_e164, min_severity')
    .eq('workspace_id', params.workspaceId);

  for (const pref of prefs || []) {
    if (SEVERITY_WEIGHT[params.severity] < SEVERITY_WEIGHT[pref.min_severity as AlertSeverity]) {
      continue;
    }

    if (pref.email_enabled) {
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(pref.user_id);
      const email = userRes.user?.email;
      if (email) {
        try {
          const sent = await sendOperationalEmail({
            to: email,
            subject: `[EcomPilot ${params.severity.toUpperCase()}] ${params.title}`,
            html: `<p><strong>${params.title}</strong></p><p>${params.body}</p>`,
            text: `${params.title}\n\n${params.body}`,
          });
          await supabaseAdmin.from('notifications').insert({
            workspace_id: params.workspaceId,
            user_id: pref.user_id,
            channel: 'email',
            severity: params.severity,
            dedup_key: params.dedupKey,
            title: params.title,
            body: params.body,
            delivery_status: 'sent',
            provider_message_id: sent.id ?? null,
            sent_at: new Date().toISOString(),
          });
        } catch (err) {
          await supabaseAdmin.from('notifications').insert({
            workspace_id: params.workspaceId,
            user_id: pref.user_id,
            channel: 'email',
            severity: params.severity,
            dedup_key: params.dedupKey,
            title: params.title,
            body: params.body,
            delivery_status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown email error',
          });
        }
      }
    }

    if (pref.whatsapp_enabled && pref.whatsapp_phone_e164 && params.severity === 'critical') {
      try {
        const wa = await sendWhatsAppAlert({
          toPhoneE164: pref.whatsapp_phone_e164,
          severity: params.severity,
          title: params.title,
          actionSummary: params.body,
        });
        await supabaseAdmin.from('notifications').insert({
          workspace_id: params.workspaceId,
          user_id: pref.user_id,
          channel: 'whatsapp',
          severity: params.severity,
          dedup_key: params.dedupKey,
          title: params.title,
          body: params.body,
          delivery_status: 'sent',
          provider_message_id: wa.messageId ?? null,
          sent_at: new Date().toISOString(),
        });
      } catch (err) {
        await supabaseAdmin.from('notifications').insert({
          workspace_id: params.workspaceId,
          user_id: pref.user_id,
          channel: 'whatsapp',
          severity: params.severity,
          dedup_key: params.dedupKey,
          title: params.title,
          body: params.body,
          delivery_status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown WhatsApp error',
        });
      }
    }
  }

  return { skipped: false };
}

export async function dispatchDailyMorningDigest(params: {
  workspaceId: string;
  workspaceName: string;
  reportDate: string;
  revenueYesterdayZar: number;
  ordersCount: number;
  lowStockCount: number;
  suppressedCount: number;
  potentialLossZar: number;
  executiveSummary: string;
  topActions: Array<{ rank: number; severity: string; action: string; impactZar: number }>;
}) {
  const dedupKey = `daily-report:${params.reportDate}`;
  const { data: prefs } = await supabaseAdmin
    .from('notification_preferences')
    .select('user_id, email_enabled, whatsapp_enabled, whatsapp_phone_e164')
    .eq('workspace_id', params.workspaceId);

  let sentCount = 0;

  for (const pref of prefs || []) {
    if (pref.email_enabled) {
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(pref.user_id);
      const email = userRes.user?.email;
      if (email) {
        try {
          const sent = await sendDailyMorningReportEmail({
            to: email,
            workspaceName: params.workspaceName,
            reportDate: params.reportDate,
            revenueYesterdayZar: params.revenueYesterdayZar,
            ordersCount: params.ordersCount,
            lowStockCount: params.lowStockCount,
            suppressedCount: params.suppressedCount,
            potentialLossZar: params.potentialLossZar,
            executiveSummary: params.executiveSummary,
            topActions: params.topActions,
          });
          sentCount += 1;
          await supabaseAdmin.from('notifications').insert({
            workspace_id: params.workspaceId,
            user_id: pref.user_id,
            channel: 'email',
            severity: 'high',
            dedup_key: dedupKey,
            title: `06:00 SAST Morning Report (${params.reportDate})`,
            body: params.executiveSummary,
            delivery_status: 'sent',
            provider_message_id: sent.id ?? null,
            sent_at: new Date().toISOString(),
          });
        } catch (err) {
          await supabaseAdmin.from('notifications').insert({
            workspace_id: params.workspaceId,
            user_id: pref.user_id,
            channel: 'email',
            severity: 'high',
            dedup_key: dedupKey,
            title: `06:00 SAST Morning Report (${params.reportDate})`,
            body: params.executiveSummary,
            delivery_status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown email error',
          });
        }
      }
    }

    if (pref.whatsapp_enabled && pref.whatsapp_phone_e164) {
      try {
        const wa = await sendWhatsAppAlert({
          toPhoneE164: pref.whatsapp_phone_e164,
          severity: 'high',
          title: `06:00 SAST Brief: R${params.revenueYesterdayZar.toLocaleString('en-ZA')} (${params.ordersCount} orders)`,
          actionSummary: `${params.suppressedCount} suppressed, ${params.lowStockCount} low stock. Top action: ${params.topActions[0]?.action || 'Review dashboard'}`,
        });
        await supabaseAdmin.from('notifications').insert({
          workspace_id: params.workspaceId,
          user_id: pref.user_id,
          channel: 'whatsapp',
          severity: 'high',
          dedup_key: dedupKey,
          title: `06:00 SAST Morning Report (${params.reportDate})`,
          body: params.executiveSummary,
          delivery_status: 'sent',
          provider_message_id: wa.messageId ?? null,
          sent_at: new Date().toISOString(),
        });
      } catch (err) {
        await supabaseAdmin.from('notifications').insert({
          workspace_id: params.workspaceId,
          user_id: pref.user_id,
          channel: 'whatsapp',
          severity: 'high',
          dedup_key: dedupKey,
          title: `06:00 SAST Morning Report (${params.reportDate})`,
          body: params.executiveSummary,
          delivery_status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown WhatsApp error',
        });
      }
    }
  }

  return { sentCount };
}
