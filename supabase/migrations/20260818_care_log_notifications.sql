-- Migration: 20260818_care_log_notifications.sql
-- Automatic real-time notification for parents whenever a caregiver logs a care activity

CREATE OR REPLACE FUNCTION public.handle_care_log_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_parent_id UUID;
    v_sitter_name TEXT;
    v_child_name TEXT;
    v_title TEXT;
    v_content TEXT;
BEGIN
    -- Get parent_id and sitter_name from bookings
    SELECT b.parent_id, p.display_name INTO v_parent_id, v_sitter_name
    FROM public.bookings b
    JOIN public.profiles p ON p.id = b.sitter_id
    WHERE b.id = NEW.booking_id;

    IF v_parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get child name if child_id is provided
    IF NEW.child_id IS NOT NULL THEN
        SELECT first_name INTO v_child_name
        FROM public.children
        WHERE id = NEW.child_id;
    END IF;

    -- Format Title & Content
    v_title := 'Care Activity: ' || INITCAP(COALESCE(NEW.category, 'Activity'));
    
    v_content := COALESCE(v_sitter_name, 'Caregiver') || ' logged a ' || LOWER(COALESCE(NEW.category, 'activity')) || ' update';
    
    IF v_child_name IS NOT NULL THEN
        v_content := v_content || ' for ' || v_child_name;
    END IF;

    IF NEW.status IS NOT NULL AND NEW.status <> '' THEN
        v_content := v_content || ' (' || NEW.status || ')';
    END IF;

    IF NEW.details IS NOT NULL AND NEW.details <> '' THEN
        v_content := v_content || ': "' || NEW.details || '"';
    ELSE
        v_content := v_content || '.';
    END IF;

    -- Insert in-app notification for the parent
    INSERT INTO public.notifications (profile_id, type, title, content, link)
    VALUES (
        v_parent_id,
        'care_activity',
        v_title,
        v_content,
        '/bookings/' || NEW.booking_id || '/carefeed'
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in handle_care_log_notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_handle_care_log_notification ON public.care_logs;
CREATE TRIGGER trg_handle_care_log_notification
AFTER INSERT ON public.care_logs
FOR EACH ROW EXECUTE FUNCTION public.handle_care_log_notification();
