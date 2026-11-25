import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { getMarketplaceAdapter, MarketplaceProvider } from '@ecompilot/connectors';
import { cloudinary, supabaseAdmin } from '../config/clients.js';
import { decryptCredentials, encryptCredentials } from '../config/crypto.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { answerOperationalQuestion, generateMarketplaceCopy } from '../services/geminiService.js';
import { syncWorkspaceCatalogAndPriorities } from '../services/syncPipelineService.js';
import { linkManualSkuAlias } from '../services/skuAliasService.js';
import { generateAndDispatchDailyReport } from '../services/dailyReportService.js';
import { recordAuditLog } from '../services/auditLogger.js';

export const apiRouter = Router();

const asyncHandler =
  (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
  };

apiRouter.use(requireAuth);

const connectSchema = z.object({
  provider: z.enum(['shopify', 'takealot']),
  accountLabel: z.string().min(2),
  storeDomain: z.string().optional(),
  accessToken: z.string().optional(),
  apiKey: z.string().optional(),
});

apiRouter.post(
  '/marketplaces/connect',
  requireRole('ecommerce_manager', 'executive'),
  asyncHandler(async (req, res) => {
    const parsed = connectSchema.parse(req.body);
    const { workspaceId, id: actorUserId, role } = req.user!;

    const creds =
      parsed.provider === 'shopify'
        ? { storeDomain: parsed.storeDomain, accessToken: parsed.accessToken }
        : { apiKey: parsed.apiKey };

    // Validate live credentials before persisting
    const adapter = getMarketplaceAdapter(parsed.provider);
    await adapter.fetchListings(creds);

    const encrypted = encryptCredentials(creds);
    const { data, error } = await supabaseAdmin
      .from('marketplace_connections')
      .insert({
        workspace_id: workspaceId,
        provider: parsed.provider,
        account_label: parsed.accountLabel,
        credentials_encrypted: encrypted,
        sync_status: 'healthy',
        health_score: 100,
      })
      .select('id, provider, account_label, sync_status, health_score')
      .single();

    if (error || !data) {
      res.status(500).json({ error: error?.message || 'Failed saving marketplace connection.' });
      return;
    }

    await recordAuditLog({
      workspaceId,
      actorUserId,
      actorRole: role,
      action: 'marketplace.connected',
      resourceType: 'marketplace_connection',
      resourceId: data.id,
      afterState: { provider: parsed.provider, accountLabel: parsed.accountLabel },
    });

    res.status(201).json({ connection: data });
  })
);

apiRouter.post(
  '/marketplaces/sync',
  asyncHandler(async (req, res) => {
    const summary = await syncWorkspaceCatalogAndPriorities(req.user!.workspaceId);
    res.json(summary);
  })
);

const aliasSchema = z.object({
  productId: z.string().uuid(),
  provider: z.enum(['shopify', 'takealot']),
  externalSku: z.string().min(1),
  externalListingId: z.string().optional(),
});

apiRouter.post(
  '/sku-aliases',
  requireRole('ecommerce_manager', 'content_manager', 'executive'),
  asyncHandler(async (req, res) => {
    const parsed = aliasSchema.parse(req.body);
    const alias = await linkManualSkuAlias({
      workspaceId: req.user!.workspaceId,
      ...parsed,
    });
    res.status(201).json({ alias });
  })
);

apiRouter.get(
  '/priority-center',
  asyncHandler(async (req, res) => {
    const { workspaceId, role } = req.user!;
    const { data, error } = await supabaseAdmin
      .from('priority_tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'open')
      .order('estimated_revenue_impact_cents', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ role, tasks: data });
  })
);

apiRouter.post(
  '/tasks/:taskId/resolve',
  asyncHandler(async (req, res) => {
    const { workspaceId, id: actorUserId, role } = req.user!;
    const { error } = await supabaseAdmin
      .from('priority_tasks')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', req.params.taskId)
      .eq('workspace_id', workspaceId);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    await recordAuditLog({
      workspaceId,
      actorUserId,
      actorRole: role,
      action: 'task.resolved',
      resourceType: 'priority_task',
      resourceId: req.params.taskId,
    });

    res.json({ resolved: true });
  })
);

apiRouter.get(
  '/marketplaces/health',
  asyncHandler(async (req, res) => {
    const { workspaceId } = req.user!;
    const { data, error } = await supabaseAdmin
      .from('marketplace_connections')
      .select('id, provider, account_label, sync_status, health_score, last_synced_at')
      .eq('workspace_id', workspaceId);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ marketplaces: data });
  })
);

apiRouter.get(
  '/reports/daily',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('daily_ai_reports')
      .select('*')
      .eq('workspace_id', req.user!.workspaceId)
      .order('report_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ report: data });
  })
);

apiRouter.post(
  '/reports/daily/send',
  requireRole('ecommerce_manager', 'executive'),
  asyncHandler(async (req, res) => {
    const result = await generateAndDispatchDailyReport(req.user!.workspaceId);
    res.json(result);
  })
);

const priceSyncSchema = z.object({
  connectionId: z.string().uuid(),
  sku: z.string().min(1),
  priceCents: z.number().int().positive(),
});

apiRouter.post(
  '/pricing/sync',
  requireRole('ecommerce_manager', 'executive'),
  asyncHandler(async (req, res) => {
    const { connectionId, sku, priceCents } = priceSyncSchema.parse(req.body);
    const { workspaceId, id: actorUserId, role } = req.user!;

    const { data: conn, error } = await supabaseAdmin
      .from('marketplace_connections')
      .select('provider, credentials_encrypted')
      .eq('id', connectionId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !conn) {
      res.status(404).json({ error: 'Marketplace connection not found.' });
      return;
    }

    const creds = decryptCredentials(conn.credentials_encrypted);
    const adapter = getMarketplaceAdapter(conn.provider as MarketplaceProvider);
    await adapter.updatePrice(creds, sku, priceCents);

    await recordAuditLog({
      workspaceId,
      actorUserId,
      actorRole: role,
      action: 'price.synced',
      resourceType: 'marketplace_listing',
      resourceId: sku,
      afterState: { provider: conn.provider, priceCents },
    });

    res.json({ synced: true, provider: conn.provider, sku, priceCents });
  })
);

apiRouter.post(
  '/ai/content-generate',
  asyncHandler(async (req, res) => {
    const result = await generateMarketplaceCopy(req.body);
    res.json(result);
  })
);

apiRouter.post(
  '/ai/chat',
  asyncHandler(async (req, res) => {
    const { message, storeContext } = req.body;
    const reply = await answerOperationalQuestion(message, req.user!.role, storeContext);
    res.json({ reply });
  })
);

apiRouter.post('/media/cloudinary-signature', (req: AuthenticatedRequest, res) => {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `ecompilot/${req.user!.workspaceId}/products`;
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET || ''
  );
  res.json({ timestamp, folder, signature, apiKey: process.env.CLOUDINARY_API_KEY });
});
