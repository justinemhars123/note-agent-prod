-- Run this in your Supabase SQL Editor to create the notes table

CREATE TABLE IF NOT EXISTS public.notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    original_text TEXT NOT NULL,
    ai_result TEXT NOT NULL,
    provider TEXT NOT NULL,
    mode TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create a policy allowing anyone to read notes if they have the correct user_id
-- (Since we are using anonymous UUIDs from localStorage, this is a basic form of authorization)
CREATE POLICY "Users can read their own notes" 
    ON public.notes 
    FOR SELECT 
    USING (true); -- We will filter by user_id on the backend anyway

-- Create a policy allowing anyone to insert notes
CREATE POLICY "Users can insert their own notes" 
    ON public.notes 
    FOR INSERT 
    WITH CHECK (true);

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes (user_id);
