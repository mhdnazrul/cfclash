-- Fix battle_submissions policies
DROP POLICY "System can insert submissions" ON public.battle_submissions;
DROP POLICY "System can update submissions" ON public.battle_submissions;

CREATE POLICY "Authenticated can insert own submissions" ON public.battle_submissions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated can update own submissions" ON public.battle_submissions 
  FOR UPDATE USING (auth.uid() = user_id);

-- Fix leaderboard policies  
DROP POLICY "System can insert leaderboard" ON public.leaderboard;
DROP POLICY "System can update leaderboard" ON public.leaderboard;

CREATE POLICY "Authenticated can insert own leaderboard" ON public.leaderboard 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated can update own leaderboard" ON public.leaderboard 
  FOR UPDATE USING (auth.uid() = user_id);