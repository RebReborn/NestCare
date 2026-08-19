import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const getServiceSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export type AdminAuditAction =
  | 'admin_login'
  | 'admin_logout'
  | 'unlocked_protected_settings'
  | 'approved_sitter'
  | 'rejected_sitter'
  | 'suspended_user'
  | 'unsuspended_user'
  | 'overrode_booking_status'
  | 'updated_financial_rules'
  | 'created_refund'
  | 'approved_refund'
  | 'rejected_refund'
  | 'partial_refund'
  | 'overrode_payment'
  | 'marked_payment_failed'
  | 'retried_payment'
  | 'changed_payout_status'
  | 'sitter_payout_blocked'
  | 'sitter_payout_released'
  | 'booking_created'
  | 'booking_accepted'
  | 'booking_declined'
  | 'booking_cancelled'
  | 'booking_started'
  | 'booking_completed'
  | 'extension_requested'
  | 'extension_approved'
  | 'extension_declined'
  | 'late_pickup_started'
  | 'late_pickup_resolved'
  | 'pickup_person_verified'
  | 'booking_override'
  | 'enabled_maintenance_mode'
  | 'disabled_maintenance_mode'
  | 'inspected_chat_transcript'
  | 'resolved_dispute'
  | 'dismissed_dispute'
  | 'resolved_report'
  | 'dismissed_report';

export type AuditSeverity = 'info' | 'warning' | 'high' | 'critical';
export type AuditResult = 'success' | 'failure';

interface LogAdminActionParams {
  adminId: string;
  actorRole?: string; // 'admin' | 'super_admin'
  action: AdminAuditAction | string;
  entityType?: 'auth' | 'user' | 'booking' | 'sitter_profile' | 'pricing_config' | 'platform_settings' | 'conversation' | 'report' | 'dispute' | 'payment';
  entityId?: string;
  details: string;
  reason?: string;
  result?: AuditResult;
  severity?: AuditSeverity;
  requestId?: string;
  sessionId?: string;
  metadata?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    [key: string]: any;
  };
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Sanitizes metadata to strictly prevent accidental logging of sensitive credentials,
 * Stripe secret keys, passwords, or full payment card information.
 */
function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitiveData);

  const sanitized: Record<string, any> = {};
  const SENSITIVE_KEYS = [
    'password', 'secret', 'token', 'stripe_secret_key', 'stripe_key', 
    'credit_card', 'card_number', 'cvv', 'auth_token', 'private_key'
  ];

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(sKey => lowerKey.includes(sKey))) {
      sanitized[key] = '[REDACTED_SENSITIVE_DATA]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Calculates a cryptographic SHA-256 hash for tamper detection linking to previous log hash.
 */
function computeLogHash(prevHash: string, payload: Record<string, any>): string {
  const content = prevHash + JSON.stringify(payload);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Server-side audit action logger for NestCare Enterprise Architecture.
 * Writes immutable, tamper-evident audit logs with before/after state diffing.
 */
export async function logAdminAction(params: LogAdminActionParams): Promise<boolean> {
  try {
    const supabase = getServiceSupabase();

    // 1. Determine severity automatically if not supplied
    let severity: AuditSeverity = params.severity || 'info';
    if (
      params.action.includes('financial') || 
      params.action.includes('maintenance') || 
      params.action.includes('suspend') ||
      params.action.includes('inspected_chat')
    ) {
      severity = 'critical';
    } else if (
      params.action.includes('override') || 
      params.action.includes('refund') || 
      params.action.includes('dispute') ||
      params.action.includes('reject')
    ) {
      severity = 'high';
    }

    // 2. Redact any sensitive credentials from metadata
    const sanitizedMetadata = redactSensitiveData(params.metadata || {});

    // 3. Fetch latest log_hash for tamper-evident hash chaining
    const { data: latestLog } = await supabase
      .from('audit_logs')
      .select('log_hash')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevHash = latestLog?.log_hash || 'GENESIS_BLOCK_HASH_NESTCARE';

    const timestamp = new Date().toISOString();
    const requestId = params.requestId || `req_${Math.random().toString(36).substring(2, 11)}`;

    const payloadToHash = {
      adminId: params.adminId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      result: params.result || 'success',
      severity,
      reason: params.reason || null,
      metadata: sanitizedMetadata,
      timestamp,
    };

    const currentHash = computeLogHash(prevHash, payloadToHash);

    const auditEntry = {
      actor_id: params.adminId,
      admin_id: params.adminId,
      actor_role: params.actorRole || 'admin',
      action: params.action,
      entity_type: params.entityType || 'admin_action',
      entity_id: params.entityId || null,
      details: params.details,
      reason: params.reason || null,
      result: params.result || 'success',
      severity,
      request_id: requestId,
      session_id: params.sessionId || null,
      metadata: sanitizedMetadata,
      ip_address: params.ipAddress || 'client_web',
      user_agent: params.userAgent || 'NestCare Admin Console',
      prev_hash: prevHash,
      log_hash: currentHash,
      created_at: timestamp,
    };

    // Insert into audit_logs
    const { error: err1 } = await supabase.from('audit_logs').insert(auditEntry);
    if (err1) {
      console.warn('[Admin Audit Logger Error]:', err1.message);
    }

    // Insert into admin_audit_logs for explicit naming compatibility
    try {
      await supabase.from('admin_audit_logs').insert(auditEntry);
    } catch {
      // Ignore if table view collision
    }

    console.log(`[Admin Audit Logged] Action: ${params.action} | Severity: ${severity} | Hash: ${currentHash.substring(0, 10)}...`);
    return true;
  } catch (err: any) {
    console.error('[Admin Audit Logger Exception]:', err);
    return false;
  }
}
