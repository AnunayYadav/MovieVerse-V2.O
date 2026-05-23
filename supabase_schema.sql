-- MovieVerse Supabase Database Schema

-- 1. user_data table: Stores user library collections (watchlist, favorites, watched history, custom lists, profiles)
CREATE TABLE IF NOT EXISTS public.user_data (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    watchlist JSONB DEFAULT '[]'::jsonb,
    favorites JSONB DEFAULT '[]'::jsonb,
    watched JSONB DEFAULT '[]'::jsonb,
    custom_lists JSONB DEFAULT '{}'::jsonb,
    profile JSONB DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    search_history JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for user_data
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_data
CREATE POLICY "Allow users to read their own data" 
ON public.user_data FOR SELECT 
TO authenticated 
USING (auth.uid()::text = id::text);

CREATE POLICY "Allow users to upsert their own data" 
ON public.user_data FOR ALL 
TO authenticated 
USING (auth.uid()::text = id::text) 
WITH CHECK (auth.uid()::text = id::text);


-- 2. watch_progress table: Stores detailed real-time watch progress for movies and TV shows
CREATE TABLE IF NOT EXISTS public.watch_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_id INTEGER NOT NULL,
    media_type VARCHAR(20) NOT NULL, -- 'movie' or 'tv'
    progress DOUBLE PRECISION NOT NULL, -- percentage completed (0 to 100)
    "current_time" DOUBLE PRECISION NOT NULL, -- in seconds
    duration DOUBLE PRECISION NOT NULL, -- in seconds
    season INTEGER, -- null for movies
    episode INTEGER, -- null for movies
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, media_id, media_type)
);

-- Create an index to quickly query watch progress
CREATE INDEX IF NOT EXISTS idx_watch_progress_user_media 
ON public.watch_progress (user_id, media_id, media_type);

-- Enable RLS for watch_progress
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for watch_progress
CREATE POLICY "Allow users to read their own progress" 
ON public.watch_progress FOR SELECT 
TO authenticated 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Allow users to insert their own progress" 
ON public.watch_progress FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Allow users to update their own progress" 
ON public.watch_progress FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Allow users to delete their own progress" 
ON public.watch_progress FOR DELETE 
TO authenticated 
USING (auth.uid()::text = user_id::text);


-- 3. notifications table: Stores application notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Allow users to read their own notifications" 
ON public.notifications FOR SELECT 
TO authenticated 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Allow users to insert their own notifications" 
ON public.notifications FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Allow users to update/mark read their own notifications" 
ON public.notifications FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);


-- 4. support_tickets table: Stores user help tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Allow users to insert tickets" 
ON public.support_tickets FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Allow users to view their own tickets" 
ON public.support_tickets FOR SELECT 
TO authenticated 
USING (auth.uid()::text = user_id::text);


-- 5. watch_parties table: Stores active Watch Party room configurations and sync states
CREATE TABLE IF NOT EXISTS public.watch_parties (
    id VARCHAR(10) PRIMARY KEY, -- Room Code (e.g. 'ABCD')
    host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_id INTEGER NOT NULL,
    media_type VARCHAR(20) NOT NULL, -- 'movie' or 'tv'
    season INTEGER, -- null for movies
    episode INTEGER, -- null for movies
    "current_time" DOUBLE PRECISION DEFAULT 0 NOT NULL,
    is_playing BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for watch_parties
ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;

-- RLS Policies for watch_parties
CREATE POLICY "Allow anyone to view watch parties" 
ON public.watch_parties FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Allow authenticated users to create watch parties" 
ON public.watch_parties FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = host_id::text);

CREATE POLICY "Allow host to update watch parties" 
ON public.watch_parties FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = host_id::text)
WITH CHECK (auth.uid()::text = host_id::text);

CREATE POLICY "Allow host to delete watch parties" 
ON public.watch_parties FOR DELETE 
TO authenticated 
USING (auth.uid()::text = host_id::text);
