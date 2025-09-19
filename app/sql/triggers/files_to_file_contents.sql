DROP FUNCTION IF EXISTS public.handle_new_file() CASCADE;

create function public.handle_new_file()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.file_contents (id, content)
    values (new.id, null);
    return new;
end;

$$;

DROP TRIGGER IF EXISTS files_to_file_contents_trigger on public.files;

create trigger files_to_file_contents_trigger
after insert on public.files
for each row execute function public.handle_new_file();