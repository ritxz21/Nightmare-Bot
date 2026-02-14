
-- Public leaderboard entries (no auth required to read)
CREATE TABLE public.leaderboard_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name text NOT NULL,
  topic_id text NOT NULL,
  topic_title text NOT NULL,
  avg_bluff_score real NOT NULL DEFAULT 0,
  sessions_count integer NOT NULL DEFAULT 1,
  best_bluff_score real NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Anyone can read the leaderboard
CREATE POLICY "Leaderboard is publicly readable"
ON public.leaderboard_entries
FOR SELECT
TO anon, authenticated
USING (true);

-- Anyone (including anon) can insert
CREATE POLICY "Anyone can submit to leaderboard"
ON public.leaderboard_entries
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow updates for score aggregation
CREATE POLICY "Anyone can update own leaderboard entry"
ON public.leaderboard_entries
FOR UPDATE
TO anon, authenticated
USING (true);
