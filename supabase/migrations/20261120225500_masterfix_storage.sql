insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('job-files', 'job-files', false, 15728640, array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']),
  ('estimate-photos', 'estimate-photos', false, 8388608, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do nothing;

-- Anyone may upload up to 5 photos into the folder of an estimate request created in the last 30 minutes.
create or replace function private.can_upload_estimate_photo(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare rid uuid; n int;
begin
  begin rid := ((storage.foldername(p_name))[1])::uuid; exception when others then return false; end;
  if not exists (select 1 from public.estimate_requests r where r.id = rid and r.created_at > now() - interval '30 minutes') then return false; end if;
  select count(*) into n from storage.objects o where o.bucket_id = 'estimate-photos' and (storage.foldername(o.name))[1] = rid::text;
  return n < 5;
end $$;
revoke all on function private.can_upload_estimate_photo(text) from public;
grant execute on function private.can_upload_estimate_photo(text) to anon, authenticated;

create or replace function private.can_read_job_file(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare jid bigint;
begin
  if private.is_office() then return true; end if;
  begin jid := ((storage.foldername(p_name))[1])::bigint; exception when others then return false; end;
  return private.owns_job(jid);
end $$;
revoke all on function private.can_read_job_file(text) from public;
grant execute on function private.can_read_job_file(text) to authenticated;

create policy estimate_photos_insert on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'estimate-photos' and private.can_upload_estimate_photo(name));
create policy estimate_photos_office_select on storage.objects for select to authenticated
  using (bucket_id = 'estimate-photos' and (select private.is_office()));
create policy estimate_photos_office_delete on storage.objects for delete to authenticated
  using (bucket_id = 'estimate-photos' and (select private.is_office()));

create policy job_files_select on storage.objects for select to authenticated
  using (bucket_id = 'job-files' and private.can_read_job_file(name));
create policy job_files_office_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'job-files' and (select private.is_office()));
create policy job_files_office_update on storage.objects for update to authenticated
  using (bucket_id = 'job-files' and (select private.is_office())) with check (bucket_id = 'job-files' and (select private.is_office()));
create policy job_files_office_delete on storage.objects for delete to authenticated
  using (bucket_id = 'job-files' and (select private.is_office()));
