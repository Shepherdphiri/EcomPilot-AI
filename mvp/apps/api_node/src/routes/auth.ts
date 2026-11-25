import { Router } from 'express';
import { supabaseAdmin } from '../config/clients.js';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.js';
import { recordAuditLog } from '../services/auditLogger.js';

export const authRouter = Router();

authRouter.get('/session', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id, email, workspaceId, role } = req.user!;
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('plan_tier, status, max_marketplaces, max_skus')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  res.json({
    user: { id, email, workspaceId, role },
    subscription: subscription || { plan_tier: 'starter', status: 'trialing', max_marketplaces: 3, max_skus: 250 },
  });
});

authRouter.post('/workspace', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Bearer token.' });
    return;
  }

  const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(header.slice(7));
  if (authErr || !authData.user) {
    res.status(401).json({ error: 'Invalid Supabase auth token.' });
    return;
  }

  const { workspaceName, fullName } = req.body as { workspaceName: string; fullName: string };
  const { data: ws, error: wsErr } = await supabaseAdmin
    .from('workspaces')
    .insert({ name: workspaceName })
    .select()
    .single();

  if (wsErr || !ws) {
    res.status(500).json({ error: wsErr?.message || 'Workspace creation failed.' });
    return;
  }

  await supabaseAdmin.from('workspace_members').insert({
    workspace_id: ws.id,
    user_id: authData.user.id,
    role: 'executive',
    full_name: fullName,
  });

  await recordAuditLog({
    workspaceId: ws.id,
    actorUserId: authData.user.id,
    actorRole: 'executive',
    action: 'workspace.created',
    resourceType: 'workspace',
    resourceId: ws.id,
    afterState: { name: workspaceName },
  });

  res.status(201).json({ workspace: ws });
});
