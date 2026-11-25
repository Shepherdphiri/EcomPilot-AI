import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/clients.js';

export type UserRole =
  | 'ecommerce_manager'
  | 'content_manager'
  | 'inventory_manager'
  | 'executive';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    workspaceId: string;
    role: UserRole;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Bearer token.' });
    return;
  }

  const token = header.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired Supabase session.' });
    return;
  }

  const workspaceId = (req.headers['x-workspace-id'] as string) || '';
  const { data: membership } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', data.user.id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!membership) {
    res.status(403).json({ error: 'User is not a member of this workspace.' });
    return;
  }

  req.user = {
    id: data.user.id,
    email: data.user.email,
    workspaceId: membership.workspace_id,
    role: membership.role as UserRole,
  };
  next();
}

export function requireRole(...allowed: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient role permissions for this action.' });
      return;
    }
    next();
  };
}
