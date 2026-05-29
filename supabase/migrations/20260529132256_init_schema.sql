-- ─── NoteAgent — Initial Schema Migration ─────────────────────────────────────
-- Run this entire file in your Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS guards.

-- ─── 1. Table ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notes (
    id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID         NOT NULL,  -- must match auth.uid() — enforced by RLS
    original_text TEXT        NOT NULL,
    ai_result    TEXT         NOT NULL,
    provider     TEXT         NOT NULL,
    mode         TEXT         NOT NULL,
    created_at   TIMESTAMPTZ  DEFAULT timezone('utc', now()) NOT NULL
);

-- ─── 2. Row Level Security ────────────────────────────────────────────────────
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Drop old insecure policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Users can read their own notes"   ON public.notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;

-- SELECT: a user can only fetch rows where user_id matches their JWT identity
CREATE POLICY "Users can read their own notes"
    ON public.notes
    FOR SELECT
    USING (user_id = auth.uid());

-- INSERT: a user can only create rows where user_id matches their JWT identity
--         (prevents one user inserting rows on behalf of another)
CREATE POLICY "Users can insert their own notes"
    ON public.notes
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- DELETE: a user can only delete their own notes
CREATE POLICY "Users can delete their own notes"
    ON public.notes
    FOR DELETE
    USING (user_id = auth.uid());

-- ─── 3. Index ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes (user_id);
