import type { SupabaseClient } from "@supabase/supabase-js";
import { PAGE_SIZE } from "../lessonmanagement/constants";
import type { Database } from "~/supa-client";

export const getStudentsByQuery = async (
  client: SupabaseClient<Database>,
  query: string,
  page: number
) => {
  const { data, error } = await client
    .from("students_view")
    .select("*")
    .or(`username.ilike.%${query}%,phone.ilike.%${query}%`)
    .order("profile_id", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const getStudentsPagesByQuery = async (
  client: SupabaseClient<Database>,
  query: string
) => {
  const { count, error } = await client
    .from("students_view")
    .select(`profile_id`, { count: "exact" })
    .or(`username.ilike.%${query}%,phone.ilike.%${query}%`);
  if (error) {
    throw new Error(error.message);
  }
  if (!count) {
    return 1;
  }
  return Math.ceil(count / PAGE_SIZE);
};

export const getStudentById = async (
  client: SupabaseClient<Database>,
  studentId: string
) => {
  const { data, error } = await client
    .from("students_view")
    .select("*")
    .eq("profile_id", studentId)
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  return data;
};

export const getOldestLessonLogWithoutStartAt = async (
  client: SupabaseClient<Database>,
  { profileId }: { profileId: string }
) => {
  let query = client
    .from("lesson_logs")
    .select("*")
    .is("start_at", null)
    .order("created_at", { ascending: false })
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle();

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const getStudentsBySearch = async (
  client: SupabaseClient<Database>,
  { search }: { search: string }
) => {
  const { data, error } = await client
    .from("students_view")
    .select("*")
    .or(
      `username.ilike.%${search}%,phone.ilike.%${search}%,name.ilike.%${search}%`
    );
  if (error) {
    throw new Error(error.message);
  }
  return data;
};
