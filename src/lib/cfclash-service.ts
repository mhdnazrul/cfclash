import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/** Difficulty-based random selection from DB (ORDER BY RANDOM() in SQL RPC). */
export async function createRoomWithDifficulties(
  displayName: string,
  visibility: "public" | "unlisted",
  durationMinutes: number,
  difficulties: number[],
) {
  const { data, error } = await supabase.rpc("create_room_with_difficulties", {
    p_display_name: displayName,
    p_visibility: visibility,
    p_duration_minutes: durationMinutes,
    p_difficulties: difficulties,
  });
  if (error) throw error;
  return data as {
    id: string;
    room_code: string;
    display_name: string | null;
    visibility: string;
    status: string;
  };
}

export async function requestJoinRoom(roomCode: string) {
  const { data, error } = await supabase.rpc("request_join_room", { p_room_code: roomCode });
  if (error) throw error;
  return data;
}

export async function requestJoinRoomByRoomId(roomId: string) {
  const { data, error } = await supabase.rpc("request_join_room_by_room_id", { p_room_id: roomId });
  if (error) throw error;
  return data;
}

export async function approveRoomRequest(requestId: string) {
  const { data, error } = await supabase.rpc("handle_room_request", {
    p_request_id: requestId,
    p_approve: true,
  });
  if (error) throw error;
  return data;
}

export async function declineRoomRequest(requestId: string) {
  const { data, error } = await supabase.rpc("handle_room_request", {
    p_request_id: requestId,
    p_approve: false,
  });
  if (error) throw error;
  return data;
}

export async function startBattle(roomId: string) {
  const { data, error } = await supabase.rpc("start_battle", { p_room_id: roomId });
  if (error) throw error;
  return data as { id: string; status: string; started_at: string | null };
}

export async function finalizeBattlePoints(roomId: string, pointsByUser: Record<string, number>) {
  const { error } = await supabase.rpc("finalize_battle_points", {
    p_room_id: roomId,
    p_points: pointsByUser as Json,
  });
  if (error) throw error;
}

export async function deleteMyAccount() {
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw error;
}
