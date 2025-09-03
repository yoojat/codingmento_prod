DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.raw_app_meta_data is not null then
        if new.raw_app_meta_data ? 'provider' AND new.raw_app_meta_data ->> 'provider' = 'email'  OR new.raw_app_meta_data ->> 'provider' = 'phone' then
            if new.raw_user_meta_data ? 'name' and new.raw_user_meta_data ? 'username' then
                insert into public.profiles (profile_id, name, username, level)
                values (new.id, new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'username', 'code-explorer');
            else
                insert into public.profiles (profile_id, name, username, level)
                values (new.id, 'Anonymous', 'mr.' || substr(md5(random()::text), 1, 8), 'code-explorer');
            end if;
        end if;

        if new.raw_app_meta_data ? 'provider' AND new.raw_app_meta_data ->> 'provider' = 'kakao' then
            insert into public.profiles (profile_id, name, username, level, avatar)
            values (new.id, new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'preferred_username' || substr(md5(random()::text), 1, 5), 'code-explorer', new.raw_user_meta_data ->> 'avatar_url');
        end if;


        if new.raw_app_meta_data ? 'provider' AND new.raw_app_meta_data ->> 'provider' = 'github' then
            insert into public.profiles (profile_id, name, username, level, avatar)
            values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'user_name' || substr(md5(random()::text), 1, 5), 'code-explorer', new.raw_user_meta_data ->> 'avatar_url');
        end if;

    end if;
    return new;
end;
$$;

DROP TRIGGER IF EXISTS user_to_profile_trigger on auth.users;

create trigger user_to_profile_trigger
after insert on auth.users
for each row execute function public.handle_new_user();