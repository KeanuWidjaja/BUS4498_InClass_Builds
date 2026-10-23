-- Stage 7: photo uploads
-- Each post can have one flyer photo. The agent uploads it; the website only shows it.

alter table public.events
  add column flyer_url text not null default '';

grant select (flyer_url) on public.events to anon, authenticated;

-- A public storage bucket for flyers: 5 MB, JPG and PNG only.
-- No storage policies for the website, so only the agent (service_role) can upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('flyers', 'flyers', true, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
