DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.raw_user_meta_data is not null then
        if new.raw_user_meta_data ? 'provider' AND new.raw_user_meta_data ->> 'provider' = 'email' then
            if new.raw_user_meta_data ? 'name' and new.raw_user_meta_data ? 'username' then
                insert into public.profiles (profile_id, name, username, level)
                values (new.id, new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'username', 'code-explorer');
            else
                insert into public.profiles (profile_id, name, username, level)
                values (new.id, 'Anonymous', 'mr.' || substr(md5(random()::text), 1, 8), 'code-explorer');
            end if;
        end if;
    end if;
    return new;
end;
$$;

DROP TRIGGER IF EXISTS user_to_profile_trigger on auth.users;

create trigger user_to_profile_trigger
after insert on auth.users
for each row execute function public.handle_new_user();