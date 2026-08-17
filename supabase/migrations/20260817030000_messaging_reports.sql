-- 1. Add image_url to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url VARCHAR(512);

-- 2. Create user_blocks table
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (blocker_id, blocked_id)
);

-- 3. Create user_reports table
CREATE TABLE IF NOT EXISTS public.user_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, resolved, dismissed
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Block RLS Policies
DROP POLICY IF EXISTS select_blocks ON public.user_blocks;
CREATE POLICY select_blocks ON public.user_blocks FOR SELECT TO authenticated
    USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

DROP POLICY IF EXISTS insert_blocks ON public.user_blocks;
CREATE POLICY insert_blocks ON public.user_blocks FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS delete_blocks ON public.user_blocks;
CREATE POLICY delete_blocks ON public.user_blocks FOR DELETE TO authenticated
    USING (auth.uid() = blocker_id);

-- Report RLS Policies
DROP POLICY IF EXISTS select_reports ON public.user_reports;
CREATE POLICY select_reports ON public.user_reports FOR SELECT TO authenticated
    USING (auth.uid() = reporter_id OR is_admin());

DROP POLICY IF EXISTS insert_reports ON public.user_reports;
CREATE POLICY insert_reports ON public.user_reports FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS update_reports ON public.user_reports;
CREATE POLICY update_reports ON public.user_reports FOR UPDATE TO authenticated
    USING (is_admin());
