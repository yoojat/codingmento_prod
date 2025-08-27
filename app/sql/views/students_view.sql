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
    ARRAY_AGG(DISTINCT relationship.parent_id) AS parent_ids,
    ARRAY_AGG(DISTINCT parent.username)   AS parent_names,
    ARRAY_AGG(DISTINCT parent.phone)      AS parent_phones
FROM public.profiles
LEFT JOIN public.lesson_logs USING (profile_id)
LEFT JOIN public.relationship ON profiles.profile_id = relationship.child_id
LEFT JOIN public.profiles AS parent ON relationship.parent_id = parent.profile_id
WHERE profiles.is_teacher IS FALSE
GROUP BY profiles.profile_id;