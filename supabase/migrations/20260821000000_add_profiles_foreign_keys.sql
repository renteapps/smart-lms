-- Add explicit foreign keys to profiles table for proper PostgREST relationship inference

ALTER TABLE public.comments 
  ADD CONSTRAINT comments_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.subscriptions 
  ADD CONSTRAINT subscriptions_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.organization_members 
  ADD CONSTRAINT organization_members_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.agent_conversations 
  ADD CONSTRAINT agent_conversations_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.certificates 
  ADD CONSTRAINT certificates_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
