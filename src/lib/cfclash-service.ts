import { supabase } from "@/integrations/supabase/client";

export async function createBattleRoom(durationMinutes: number, ratings: number[]) {
  const { data, error } = await supabase.rpc("create_room_with_problems", {
    p_duration_minutes: durationMinutes,
    p_ratings: ratings,
  });
  if (error) throw error;
  return data;
}

export async function requestJoinRoom(roomCode: string) {
  const { data, error } = await supabase.rpc("request_join_room", { p_room_code: roomCode });
  if (error) throw error;
  return data;
}

export async function approveRoomRequest(requestId: string) {
  const { data, error } = await supabase.rpc("handle_room_request", { p_request_id: requestId, p_approve: true });
  if (error) throw error;
  return data;
}

export async function declineRoomRequest(requestId: string) {
  const { data, error } = await supabase.rpc("handle_room_request", { p_request_id: requestId, p_approve: false });
  if (error) throw error;
  return data;
}
