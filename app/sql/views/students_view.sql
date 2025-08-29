CREATE OR REPLACE VIEW students_view AS
SELECT
    profiles.profile_id,
    profiles.username,
    profiles.phone,
    profiles.birth,
    profiles.gender,
    profiles.location,
    profiles.comment,
    profiles.lesson_day,
    profiles.lesson_time,
    COUNT(lesson_logs.profile_id) AS lesson_count,
    ARRAY_AGG(DISTINCT pc.parent_id)           AS parent_ids,
    ARRAY_AGG(DISTINCT parent.username)        AS parent_names,
    ARRAY_AGG(DISTINCT parent.phone)           AS parent_phones,
    ARRAY_AGG(DISTINCT teacher.username)       AS teacher_names,
    ARRAY_AGG(DISTINCT teacher.phone)          AS teacher_phones,
    profiles.level,
    ARRAY_AGG(DISTINCT lesson_logs.id)         AS lesson_log_ids,
    ARRAY_AGG(DISTINCT lesson_logs.start_at)   AS lesson_log_start_ats,
    ARRAY_AGG(DISTINCT lesson_logs.end_at)     AS lesson_log_end_ats,
    ARRAY_AGG(DISTINCT lesson_logs.subject)    AS lesson_log_subjects,
    ARRAY_AGG(DISTINCT payments.id)            AS payment_ids,
    ARRAY_AGG(DISTINCT payments.amount)        AS payment_amounts,
    ARRAY_AGG(DISTINCT payments.created_at)    AS payment_created_ats,
    ARRAY_AGG(DISTINCT lesson_membership.id)   AS lesson_membership_ids,
    ARRAY_AGG(DISTINCT lesson_membership.is_checked) AS lesson_membership_is_checked,
    profiles.avatar
FROM public.profiles
LEFT JOIN public.lesson_logs ON lesson_logs.profile_id = profiles.profile_id
LEFT JOIN public.parent_children AS pc ON pc.child_id = profiles.profile_id
LEFT JOIN public.profiles AS parent ON pc.parent_id = parent.profile_id
LEFT JOIN public.teacher_students AS ts ON ts.student_id = profiles.profile_id
LEFT JOIN public.profiles AS teacher ON ts.teacher_id = teacher.profile_id
LEFT JOIN public.payments ON payments.user_id = profiles.profile_id
LEFT JOIN public.lesson_membership ON lesson_membership.profile_id = profiles.profile_id
WHERE profiles.is_teacher IS FALSE
GROUP BY profiles.profile_id;