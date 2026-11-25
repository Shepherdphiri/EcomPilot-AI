import express, { Router } from 'express';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { createCheckoutSession, handleStripeWebhook, PlanTier } from '../services/stripeBillingService.js';
import { recordAuditLog } from '../services/auditLogger.js';

export const billingRouter = Router();

billingRouter.post(
  '/checkout-session',
  requireAuth,
  requireRole('executive', 'ecommerce_manager'),
  async (req: AuthenticatedRequest, res) => {
    const { tier, successUrl, cancelUrl } = req.body as {
      tier: PlanTier;
      successUrl: string;
      cancelUrl: string;
    };

    const session = await createCheckoutSession({
      workspaceId: req.user!.workspaceId,
      customerEmail: req.user!.email || '',
      tier,
      successUrl,
      cancelUrl,
    });

    await recordAuditLog({
      workspaceId: req.user!.workspaceId,
      actorUserId: req.user!.id,
      actorRole: req.user!.role,
      action: 'billing.checkout_initiated',
      resourceType: 'subscription',
      resourceId: session.id,
      afterState: { tier },
    });

    res.json({ url: session.url });
  }
);

billingRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;
    const result = await handleStripeWebhook(req.body as Buffer, signature);
    res.json(result);
  }
);
