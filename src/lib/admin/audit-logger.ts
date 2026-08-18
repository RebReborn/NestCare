import { createClient } from '@supabase/supabase-js';

const getServiceSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export type AdminAuditAction =
  | 'admin_login'
  | 'admin_logout'
  | 'viewed_dashboard'
  | 'approved_sitter'
  | 'rejected_sitter'
  | 'suspended_user'
  | 'unsuspended_user'
  | 'overrode_booking_status'
  | 'updated_financial_rules'
  | 'enabled_maintenance_mode'
  | 'disabled_maintenance_mode'
  | 'inspected_chat_transcript'
  | 'resolved_dispute'
  | 'dismissed_dispute'
  | 'resolved_report'
  | 'dismissed_report';

interface LogAdminActionParams {
  adminId: string;
  action: AdminAuditAction | string;
  entityType?: 'auth' | 'user' | 'booking' | 'sitter_profile' | 'pricing_config' | 'platform_settings' | 'conversation' | 'report' | 'dispute';
  entityId?: string;
  details: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Persists an administrative audit log entry to PostgreSQL audit_logs table.
 * Uses service role client to guarantee delivery regardless of client-side RLS context.
 */
export async function logAdminAction(params: LogAdminActionParams): Promise<boolean> {
  try {
    const supabase = getServiceSupabase();

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: params.adminId,
        admin_id: params.adminId,
        action: params.action,
        entity_type: params.entityType || 'admin_action',
        entity_id: params.entityId || null,
        details: params.details,
        metadata: params.metadata || {},
        ip_address: params.ipAddress || 'client_web',
        user_agent: params.userAgent || 'NestCare Admin Console',
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.warn('[Admin Audit Logger Error]:', error.message);
      return false;
    }

    console.log(`[Admin Audit Logged] Action: ${params.action} | Admin: ${params.adminId} | Details: ${params.details}`);
    return true;
  } catch (err: any) {
    console.error('[Admin Audit Logger Exception]:', err);
    return false;
  }
}
