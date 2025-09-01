import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/supa-client";

export const getUserProfile = async (
  client: SupabaseClient<Database>,
  username: string
) => {
  const { data, error } = await client
    .from("profiles")
    .select(
      `
        profile_id,
        username,
        birth,
        gender,
        location,
        lesson_day,
        lesson_time,
        avatar,
        name,
        level
        `
    )
    .eq("username", username)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data ?? null;
};

export const getUserByUsername = async (
  client: SupabaseClient<Database>,
  username: string
) => {
  const { data, error } = await client
    .from("students_view")
    .select("lesson_logs")
    .eq("username", username)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const getUserById = async (
  client: SupabaseClient<Database>,
  { id }: { id: string }
) => {
  const { data, error } = await client
    .from("profiles")
    .select(`profile_id, username, name, avatar`)
    .eq("profile_id", id)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data; // 없으면 null
};
