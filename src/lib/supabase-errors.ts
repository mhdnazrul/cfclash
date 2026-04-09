/** Human-readable message from Supabase PostgrestError or thrown RPC errors. */
export function supabaseErrorMessage(e: unknown, fallback = "Something went wrong"): string {
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  if (e instanceof Error && e.message.trim()) return e.message;
  return fallback;
}
