DROP TRIGGER IF EXISTS handle_payment_after_insert ON public.payments;
DROP FUNCTION IF EXISTS public.handle_payment();

create function public.handle_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    updated_count integer := 0;
    remaining_count integer := 0;
begin

    if NEW.lesson_count > 0 then
        -- 1) 기존 미결제 lesson_logs(오래된 순)부터 이번 결제에 매핑
        UPDATE public.lesson_logs l
        SET payment_id = NEW.id
        FROM (
            SELECT id
            FROM public.lesson_logs
            WHERE profile_id = NEW.user_id
              AND payment_id IS NULL
            ORDER BY created_at DESC
            LIMIT NEW.lesson_count
        ) pick
        WHERE l.id = pick.id;

        GET DIAGNOSTICS updated_count = ROW_COUNT;

        -- 2) 남은 수량만큼 새 lesson_logs 생성
        remaining_count := NEW.lesson_count - COALESCE(updated_count, 0);
        IF remaining_count > 0 THEN
            INSERT INTO public.lesson_logs (profile_id, payment_id)
            SELECT NEW.profile_id, NEW.id
            FROM generate_series(1, remaining_count);
        END IF;
    END IF;

    return NEW;
end;
$$;

create trigger handle_payment_after_insert
after insert on public.payments
for each row execute function public.handle_payment();