export type UserRole = 'parent' | 'sitter' | 'admin';
export type AccountStatus = 'active' | 'pending_verification' | 'suspended' | 'deactivated' | 'deleted';
export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'identity_verified'
  | 'background_check_pending'
  | 'background_checked'
  | 'fully_verified'
  | 'rejected'
  | 'suspended';

export type BookingStatus =
  | 'draft'
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'in_progress'
  | 'completed'
  | 'disputed'
  | 'refunded';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type DisputeStatus = 'open' | 'investigating' | 'resolved' | 'rejected' | 'refunded';
export type ExceptionType = 'unavailable' | 'available_override';

export interface Profile {
  id: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  email: string;
  date_of_birth: string;
  bio: string | null;
  location_lat: number | null;
  location_lng: number | null;
  verification_status: VerificationStatus;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface SitterProfile {
  id: string;
  headline: string | null;
  bio: string | null;
  base_hourly_rate_cents: number;
  additional_child_rate_cents: number;
  pricing_model: 'flat' | 'additional_child' | 'per_child';
  years_experience: number;
  background_check_status: VerificationStatus;
  background_check_date: string | null;
  identity_verified: boolean;
  phone_verified: boolean;
  email_verified: boolean;
  is_available: boolean;
  minimum_booking_hours: number;
  max_children: number;
  minimum_notice_hours: number;
  created_at: string;
  updated_at: string;
  services?: string[];
  languages?: string[];
}

export interface SitterService {
  id: string;
  sitter_id: string;
  service_type: string;
  created_at: string;
}

export interface SitterLanguage {
  id: string;
  sitter_id: string;
  language: string;
  created_at: string;
}

export interface Child {
  id: string;
  parent_id: string;
  first_name: string;
  date_of_birth: string;
  age_group: string;
  special_instructions: string | null;
  allergies: string | null;
  medical_notes: string | null;
  emergency_information: string | null;
  medications: string | null;
  school: string | null;
  authorized_pickup: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContact {
  id: string;
  parent_id: string;
  name: string;
  relationship: string;
  phone: string;
  secondary_phone?: string | null;
  notes?: string | null;
  contact_type: 'primary' | 'secondary' | 'doctor';
  created_at?: string;
  updated_at?: string;
}

export interface AvailabilityRule {
  id: string;
  sitter_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityException {
  id: string;
  sitter_id: string;
  exception_type: ExceptionType;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
}

export interface PricingConfig {
  id: string;
  platform_percentage: number;
  min_platform_fee: number;
  max_platform_fee: number;
  tax_percentage: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  parent_id: string;
  sitter_id: string;
  status: BookingStatus;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  hourly_rate: number;
  subtotal: number;
  platform_fee: number;
  tax: number;
  total: number;
  currency: string;
  special_notes: string | null;
  pickup_required: boolean;
  pickup_location: string | null;
  cancellation_policy_snapshot: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  completed_at: string | null;
  children?: Child[];
}

export interface BookingChildren {
  booking_id: string;
  child_id: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  stripe_payment_intent_id: string;
  status: PaymentStatus;
  amount: number;
  platform_fee_cut: number;
  sitter_payout_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Payout {
  id: string;
  sitter_id: string;
  stripe_transfer_id: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface StripeAccount {
  id: string;
  profile_id: string;
  stripe_customer_id: string | null;
  stripe_connect_id: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Favorite {
  id: string;
  parent_id: string;
  sitter_id: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  booking_id: string | null;
  created_at: string;
  updated_at: string;
  participants?: Profile[];
  last_message?: Message;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  profile_id: string;
  last_read_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface Notification {
  id: string;
  profile_id: string;
  type: string;
  title: string;
  content: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  profile_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  updated_at: string;
}

export interface Dispute {
  id: string;
  booking_id: string;
  reporter_id: string;
  status: DisputeStatus;
  reason: string;
  description: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
