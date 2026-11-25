import { geminiAI, supabaseAdmin } from '../config/clients.js';
import { dispatchDailyMorningDigest } from './notificationEngine.js';

function getSastYesterdayBounds(): { reportDate: string; startIso: string; endIso: string } {
  const nowSast = new Date(Date.now() + 2 * 3600 * 1000);
  const yesterdaySast = new Date(nowSast.getTime() - 24 * 3600 * 1000);
  const yyyy = yesterdaySast.getUTCFullYear();
  const mm = String(yesterdaySast.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(yesterdaySast.getUTCDate()).padStart(2, '0');
  const reportDate = `${yyyy}-${mm}-${dd}`;
  // SAST is UTC+2 year-round
  const startIso = `${reportDate}T00:00:00+02:00`;
  const endIso = `${reportDate}T23:59:59+02:00`;
  return { reportDate, startIso, endIso };
}

export async function generateAndDispatchDailyReport(workspaceId: string) {
  const { reportDate, startIso, endIso } = getSastYesterdayBounds();

  const { data: workspace } = await supabaseAdmin
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single();

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('gross_total_cents')
    .eq('workspace_id', workspaceId)
    .gte('ordered_at', startIso)
    .lte('ordered_at', endIso);

  const revenueYesterdayCents = (orders || []).reduce(
    (sum, o) => sum + Number(o.gross_total_cents || 0),
    0
  );
  const ordersCount = (orders || []).length;

  const { data: suppressed } = await supabaseAdmin
    .from('marketplace_listings')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'suppressed');

  const { data: lowStock } = await supabaseAdmin
    .from('inventory_snapshots')
    .select('product_id, days_of_cover')
    .eq('workspace_id', workspaceId)
    .lt('days_of_cover', 14);

  const uniqueLowStock = new Set((lowStock || []).map((r) => r.product_id)).size;

  const { data: openTasks } = await supabaseAdmin
    .from('priority_tasks')
    .select('severity, title, recommended_action, estimated_revenue_impact_cents')
    .eq('workspace_id', workspaceId)
    .eq('status', 'open')
    .order('estimated_revenue_impact_cents', { ascending: false })
    .limit(5);

  const potentialLossCents = (openTasks || []).reduce(
    (sum, t) => sum + Number(t.estimated_revenue_impact_cents || 0),
    0
  );

  const topActions = (openTasks || []).map((t, idx) => ({
    rank: idx + 1,
    severity: t.severity,
    action: `${t.title} — ${t.recommended_action}`,
    impactZar: Math.round(Number(t.estimated_revenue_impact_cents || 0) / 100),
  }));

  const revenueYesterdayZar = Math.round(revenueYesterdayCents / 100);
  const potentialLossZar = Math.round(potentialLossCents / 100);
  const suppressedCount = (suppressed || []).length;

  let executiveSummary = `Yesterday closed at R${revenueYesterdayZar.toLocaleString('en-ZA')} across ${ordersCount} orders. ${suppressedCount} listings are suppressed and ${uniqueLowStock} SKUs have under 14 days of stock cover, putting R${potentialLossZar.toLocaleString('en-ZA')} at daily risk.`;

  if (process.env.GEMINI_API_KEY) {
    try {
      const aiRes = await geminiAI.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Write a concise 2-sentence executive morning briefing in plain business English (ZAR currency) from these metrics: Revenue Yesterday R${revenueYesterdayZar}, Orders ${ordersCount}, Low Stock SKUs ${uniqueLowStock}, Suppressed Listings ${suppressedCount}, Potential Loss R${potentialLossZar}, Top Actions: ${JSON.stringify(topActions)}`,
      });
      if (aiRes.text?.trim()) {
        executiveSummary = aiRes.text.trim();
      }
    } catch (err) {
      console.warn('[DailyReport] Falling back to deterministic summary:', err);
    }
  }

  await supabaseAdmin.from('daily_ai_reports').upsert(
    {
      workspace_id: workspaceId,
      report_date: reportDate,
      revenue_yesterday_cents: revenueYesterdayCents,
      orders_count: ordersCount,
      low_stock_count: uniqueLowStock,
      suppressed_count: suppressedCount,
      delayed_deliveries_count: 0,
      potential_loss_cents: potentialLossCents,
      executive_summary: executiveSummary,
      top_actions: topActions,
    },
    { onConflict: 'workspace_id,report_date' }
  );

  const delivery = await dispatchDailyMorningDigest({
    workspaceId,
    workspaceName: workspace?.name || 'EcomPilot Workspace',
    reportDate,
    revenueYesterdayZar,
    ordersCount,
    lowStockCount: uniqueLowStock,
    suppressedCount,
    potentialLossZar,
    executiveSummary,
    topActions,
  });

  return {
    reportDate,
    revenueYesterdayZar,
    ordersCount,
    lowStockCount: uniqueLowStock,
    suppressedCount,
    potentialLossZar,
    executiveSummary,
    topActions,
    emailsSent: delivery.sentCount,
  };
}
