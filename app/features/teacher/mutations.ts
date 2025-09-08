import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/supa-client";
import { getOldestLessonLogWithoutStartAt } from "./queries";

type LessonLogInsert = Database["public"]["Tables"]["lesson_logs"]["Insert"];

export const createLessonLog = async (
  client: SupabaseClient<Database>,
  data: LessonLogInsert
) => {
  const existingLessonLog = await getOldestLessonLogWithoutStartAt(client, {
    profileId: data.profile_id,
  });
  if (existingLessonLog) {
    const { data: updated, error } = await client
      .from("lesson_logs")
      .update({
        start_at: data.start_at ?? null,
        end_at: data.end_at ?? null,
        subject: data.subject ?? null,
        content: data.content ?? null,
        class_vibe: data.class_vibe ?? null,
        student_reaction: data.student_reaction ?? null,
        img_url: data.img_url ?? null,
        next_week_plan: data.next_week_plan ?? null,
      })
      .eq("id", existingLessonLog.id)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  } else {
    const { data: inserted, error } = await client
      .from("lesson_logs")
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  }
};
