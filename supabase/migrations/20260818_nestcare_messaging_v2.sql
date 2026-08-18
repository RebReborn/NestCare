-- Migration: 20260818_nestcare_messaging_v2.sql
-- Comprehensive NestCare Messaging System Upgrade

-- 1. Upgrade conversations table
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sitter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, read_only, archived, restricted
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill parent_id and sitter_id from bookings where available
UPDATE public.conversations c
SET 
  parent_id = b.parent_id,
  sitter_id = b.sitter_id
FROM public.bookings b
WHERE c.booking_id = b.id AND (c.parent_id IS NULL OR c.sitter_id IS NULL);

-- Backfill from conversation_participants if booking_id was null
UPDATE public.conversations c
SET parent_id = cp.profile_id
FROM public.conversation_participants cp
JOIN public.profiles p ON p.id = cp.profile_id
WHERE cp.conversation_id = c.id AND p.role = 'parent' AND c.parent_id IS NULL;

UPDATE public.conversations c
SET sitter_id = cp.profile_id
FROM public.conversation_participants cp
JOIN public.profiles p ON p.id = cp.profile_id
WHERE cp.conversation_id = c.id AND p.role = 'sitter' AND c.sitter_id IS NULL;

-- 2. Upgrade messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) NOT NULL DEFAULT 'text', -- text, image, document, system, booking_update, extension_request, extension_approved, extension_declined, pickup_update, payment_update, eta_update
  ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(512),
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- 3. Create message_reads table
CREATE TABLE IF NOT EXISTS public.message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

-- 4. Create message_reports table
CREATE TABLE IF NOT EXISTS public.message_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason_category VARCHAR(100) NOT NULL, -- Harassment, Inappropriate Content, Off-Platform Payment Request, Scam / Fraud, Unsafe Behavior, Other
  details TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, resolved, dismissed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Trigger to automatically update conversations.last_message_at on new message
CREATE OR REPLACE FUNCTION public.handle_new_message_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_message_last_message_at ON public.messages;
CREATE TRIGGER trg_new_message_last_message_at
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_last_message_at();

-- 6. Trigger to detect off-platform payment attempts or phone numbers
CREATE OR REPLACE FUNCTION public.detect_offplatform_messages()
RETURNS TRIGGER AS $$
DECLARE
  lower_content TEXT;
BEGIN
  IF NEW.content IS NULL THEN
    RETURN NEW;
  END IF;

  lower_content := LOWER(NEW.content);

  -- Check for suspicious payment or contact keywords
  IF lower_content ~* '(pay\s+me\s+outside|zelle|venmo|cash\s*app|paypal|e-?transfer|pay\s+cash|under\s+the\s+table|off\s+the\s+app)'
     OR lower_content ~* '(\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b)' -- basic phone pattern
  THEN
    NEW.flagged_for_review := TRUE;
    NEW.flag_reason := 'Potential off-platform payment or contact attempt detected';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_detect_offplatform_messages ON public.messages;
CREATE TRIGGER trg_detect_offplatform_messages
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.detect_offplatform_messages();

-- 7. Trigger to automatically create system messages from booking_timeline_events
CREATE OR REPLACE FUNCTION public.handle_booking_timeline_system_message()
RETURNS TRIGGER AS $$
DECLARE
  v_conv_id UUID;
  v_parent_id UUID;
  v_msg_type VARCHAR(50);
  v_content TEXT;
BEGIN
  -- Get conversation_id and parent_id for the booking
  SELECT id, parent_id INTO v_conv_id, v_parent_id
  FROM public.conversations
  WHERE booking_id = NEW.booking_id;

  IF v_conv_id IS NULL THEN
    -- If no conversation exists yet for this booking, find parent_id from booking and create conversation
    SELECT b.parent_id INTO v_parent_id
    FROM public.bookings b
    WHERE b.id = NEW.booking_id;

    IF v_parent_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Create conversation
    INSERT INTO public.conversations (booking_id, parent_id, sitter_id, status)
    SELECT id, parent_id, sitter_id, 'active'
    FROM public.bookings
    WHERE id = NEW.booking_id
    RETURNING id INTO v_conv_id;
  END IF;

  -- Determine message_type and friendly text based on timeline event_type
  v_msg_type := CASE 
    WHEN NEW.event_type = 'extension_requested' THEN 'extension_request'
    WHEN NEW.event_type = 'extension_approved' THEN 'extension_approved'
    WHEN NEW.event_type = 'extension_declined' THEN 'extension_declined'
    WHEN NEW.event_type = 'late_pickup_started' THEN 'pickup_update'
    WHEN NEW.event_type = 'overdue_care' THEN 'pickup_update'
    WHEN NEW.event_type = 'care_completed' THEN 'booking_update'
    ELSE 'system'
  END;

  v_content := 'NestCare System: ' || COALESCE(NEW.summary, NEW.event_type);

  -- Insert automated system message into conversation
  INSERT INTO public.messages (conversation_id, sender_id, message_type, content)
  VALUES (v_conv_id, v_parent_id, v_msg_type, v_content);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_booking_timeline_system_message: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_timeline_system_message ON public.booking_timeline_events;
CREATE TRIGGER trg_booking_timeline_system_message
AFTER INSERT ON public.booking_timeline_events
FOR EACH ROW EXECUTE FUNCTION public.handle_booking_timeline_system_message();

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

-- Conversations Policies
DROP POLICY IF EXISTS select_conversations ON public.conversations;
CREATE POLICY select_conversations ON public.conversations FOR SELECT TO authenticated
  USING (
    auth.uid() = parent_id 
    OR auth.uid() = sitter_id 
    OR EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = id AND cp.profile_id = auth.uid())
    OR is_admin()
  );

DROP POLICY IF EXISTS insert_conversations ON public.conversations;
CREATE POLICY insert_conversations ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = parent_id OR auth.uid() = sitter_id OR is_admin()
  );

DROP POLICY IF EXISTS update_conversations ON public.conversations;
CREATE POLICY update_conversations ON public.conversations FOR UPDATE TO authenticated
  USING (
    auth.uid() = parent_id OR auth.uid() = sitter_id OR is_admin()
  );

-- Messages Policies
DROP POLICY IF EXISTS select_messages ON public.messages;
CREATE POLICY select_messages ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = messages.conversation_id 
      AND (c.parent_id = auth.uid() OR c.sitter_id = auth.uid() OR is_admin())
    )
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = messages.conversation_id AND cp.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS insert_messages ON public.messages;
CREATE POLICY insert_messages ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND (
      EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = conversation_id 
        AND (c.parent_id = auth.uid() OR c.sitter_id = auth.uid() OR is_admin())
      )
      OR EXISTS (
        SELECT 1 FROM public.conversation_participants cp 
        WHERE cp.conversation_id = conversation_id AND cp.profile_id = auth.uid()
      )
    )
  );

-- Message Reads Policies
DROP POLICY IF EXISTS select_message_reads ON public.message_reads;
CREATE POLICY select_message_reads ON public.message_reads FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS insert_message_reads ON public.message_reads;
CREATE POLICY insert_message_reads ON public.message_reads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Message Reports Policies
DROP POLICY IF EXISTS select_message_reports ON public.message_reports;
CREATE POLICY select_message_reports ON public.message_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR is_admin());

DROP POLICY IF EXISTS insert_message_reports ON public.message_reports;
CREATE POLICY insert_message_reports ON public.message_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);
