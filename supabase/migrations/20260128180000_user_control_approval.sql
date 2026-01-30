-- User control table: role, approval, audit (approved_by)
CREATE TABLE public.user_control (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for admin lookups
CREATE INDEX idx_user_control_user_id ON public.user_control (user_id);
CREATE INDEX idx_user_control_role ON public.user_control (role);
CREATE INDEX idx_user_control_approved ON public.user_control (approved);

-- Trigger for updated_at
CREATE TRIGGER update_user_control_updated_at
BEFORE UPDATE ON public.user_control
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: true if current user has role = admin
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_control
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- RLS
ALTER TABLE public.user_control ENABLE ROW LEVEL SECURITY;

-- Users can read their own row
CREATE POLICY "Users can view own user_control"
ON public.user_control FOR SELECT
USING (auth.uid() = user_id);

-- Admins can read all rows
CREATE POLICY "Admins can view all user_control"
ON public.user_control FOR SELECT
USING (public.current_user_is_admin());

-- Users can insert their own row (on signup)
CREATE POLICY "Users can insert own user_control"
ON public.user_control FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only admins can update (approve/block)
CREATE POLICY "Admins can update user_control"
ON public.user_control FOR UPDATE
USING (public.current_user_is_admin());
