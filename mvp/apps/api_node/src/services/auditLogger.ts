import { supabaseAdmin } from '../config/clients.js';
import { UserRole } from '../middleware/auth.js';

export interface AuditEntry {
  workspaceId: string;
  actorUserId?: string;
  actorRole?: UserRole;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeState?: unknown;
  afterState?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export async function recordAuditLog(entry: AuditEntry): Promise<void> {
  const { error } = await supabaseAdmin.from('audit_logs').insert({
    workspace_id: entry.workspaceId,
    actor_user_id: entry.actorUserId ?? null,
    actor_role: entry.actorRole ?? null,
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId,
    before_state: entry.beforeState ?? null,
    after_state: entry.afterState ?? null,
    ip_address: entry.ipAddress ?? null,
    user_agent: entry.userAgent ?? null,
  });

  if (error) {
    console.error('[AuditLogger] Failed to write audit log:', error.message);
  }
}
