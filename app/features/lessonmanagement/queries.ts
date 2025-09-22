// import { asc, eq } from "drizzle-orm";
// import db from "~/db";
// import { lessonLogs } from "../teacher/schema";
// import { profiles } from "../users/schema";

// export const getLessonLogs = async () => {
//   const logs = await db
//     .select({
//       id: lessonLogs.id,
//       start_at: lessonLogs.start_at,
//       end_at: lessonLogs.end_at,
//       subject: lessonLogs.subject,
//       content: lessonLogs.content,
//       class_vibe: lessonLogs.class_vibe,
//       student_reaction: lessonLogs.student_reaction,
//       img_url: lessonLogs.img_url,
//       next_week_plan: lessonLogs.next_week_plan,
//       created_at: lessonLogs.created_at,
//       updated_at: lessonLogs.updated_at,
//       user_name: profiles.name,
//       user_avatar: profiles.avatar,
//     })
//     .from(lessonLogs)
//     .innerJoin(profiles, eq(lessonLogs.user_id, profiles.profile_id))
//     .orderBy(asc(lessonLogs.id));
//   return logs;
// };

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DateTime } from "luxon";
import { PAGE_SIZE } from "./constants";
const paramsSchema = z.object({
  year: z.coerce.number(),
  month: z.coerce.number(),
  day: z.coerce.number(),
});

export const lessonLogsSelect = `id,
start_at,
end_at,
subject,
content,
class_vibe,
student_reaction,
img_url,
next_week_plan,
created_at,
updated_at,
profiles:profiles!lesson_logs_profile_id_profiles_profile_id_fk!inner( username )`;

export const getLessonLogsByDateRange = async (
  client: SupabaseClient,
  {
    startDate,
    endDate,
    page = 1,
  }: {
    startDate: DateTime;
    endDate: DateTime;
    page?: number;
  }
) => {
  const { data, error } = await client
    .from("lesson_logs")
    .select(lessonLogsSelect)
    .order("created_at", { ascending: true })
    .gte("created_at", startDate.toISO())
    .lt("created_at", endDate.toISO())
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const getLessonLogsPagesByDateRange = async (
  client: SupabaseClient,
  {
    startDate,
    endDate,
  }: {
    startDate: DateTime;
    endDate: DateTime;
  }
) => {
  const { count, error } = await client
    .from("lesson_logs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startDate.toISO())
    .lt("created_at", endDate.toISO());
  if (error) {
    throw new Error(error.message);
  }
  if (!count) {
    return 1;
  }
  return Math.ceil(count / PAGE_SIZE);
};

export const getLessonCountByProfileId = async (
  client: SupabaseClient,
  { profileId }: { profileId: string }
) => {
  const { data, error } = await client
    .from("lesson_logs")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId);
  if (error) {
    throw new Error(error.message);
  }
  return data;
};
