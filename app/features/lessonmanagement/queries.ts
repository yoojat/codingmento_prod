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

import client from "~/supa-client";

export const getLessonLogs = async () => {
  await new Promise((resolve) => setTimeout(resolve, 4000));

  const { data, error } = await client
    .from("lesson_logs")
    .select(
      `id,
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
       profiles:profiles!lesson_logs_profile_id_fkey ( username )`
    )
    .order("id", { ascending: true });
  console.log(data);
  if (error) {
    throw new Error(error.message);
  }
  return data;
};
