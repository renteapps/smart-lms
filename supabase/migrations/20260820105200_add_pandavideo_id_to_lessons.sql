-- Add pandavideo_id to lessons table to support video selection via PandaVideo Integration
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS pandavideo_id TEXT;
