DROP VIEW IF EXISTS students_view;

CREATE OR REPLACE VIEW students_view AS
SELECT
    profiles.profile_id,
    profiles.name,
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
  -- 수업(lesson_logs) JSON 배열
    COALESCE((
        SELECT jsonb_agg(
                jsonb_build_object(
                'id',      l.id,
                'startAt', l.start_at,
                'endAt',   l.end_at,
                'subject', l.subject,
                'payment_id', p.id,
                'payment_created_at', p.created_at,
                'product_name', product.name,
                'product_amount', product.amount
                )
                ORDER BY l.start_at DESC
            )
        FROM public.lesson_logs l
        LEFT JOIN public.payments p ON p.id = l.payment_id
        LEFT JOIN public.products product ON p.product_id = product.id
        WHERE l.profile_id = profiles.profile_id
    ), '[]'::jsonb) AS lesson_logs,

    ARRAY_AGG(DISTINCT payments.id)            AS payment_ids,
    ARRAY_AGG(DISTINCT payments.created_at)    AS payment_created_ats,
    profiles.avatar
FROM public.profiles
LEFT JOIN public.lesson_logs ON lesson_logs.profile_id = profiles.profile_id
LEFT JOIN public.parent_children AS pc ON pc.child_id = profiles.profile_id
LEFT JOIN public.profiles AS parent ON pc.parent_id = parent.profile_id
LEFT JOIN public.teacher_students AS ts ON ts.student_id = profiles.profile_id
LEFT JOIN public.profiles AS teacher ON ts.teacher_id = teacher.profile_id
LEFT JOIN public.payments ON payments.profile_id = profiles.profile_id
GROUP BY profiles.profile_id;