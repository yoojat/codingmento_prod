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
