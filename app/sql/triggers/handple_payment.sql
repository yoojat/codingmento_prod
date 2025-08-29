DROP TRIGGER IF EXISTS handle_payment_after_insert ON public.payments;
DROP FUNCTION IF EXISTS public.handle_payment();

create function public.handle_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$

begin

    if  NEW.lesson_count > 0 then
        insert into public.lesson_logs (profile_id, payment_id)
        select NEW.user_id, NEW.id
        from generate_series(1, NEW.lesson_count);
    end if;

    return NEW;
end;
$$;

create trigger handle_payment_after_insert
after insert on public.payments
for each row execute function public.handle_payment();