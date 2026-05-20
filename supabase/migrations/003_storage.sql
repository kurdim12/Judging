-- Storage buckets and policies
insert into storage.buckets (id, name, public)
values
  ('submissions', 'submissions', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Submissions bucket: authenticated users upload to their team folder, judges/admins read.
create policy "submission upload"
  on storage.objects for insert
  with check (bucket_id = 'submissions' and auth.uid() is not null);

create policy "submission read"
  on storage.objects for select
  using (bucket_id = 'submissions' and auth.uid() is not null);

create policy "submission update"
  on storage.objects for update
  using (bucket_id = 'submissions' and auth.uid() is not null);

create policy "submission delete"
  on storage.objects for delete
  using (bucket_id = 'submissions' and auth.uid() is not null);

-- Avatars: public read, owner write
create policy "avatar read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatar write" on storage.objects for insert with check (
  bucket_id = 'avatars' and auth.uid() is not null
);
create policy "avatar update" on storage.objects for update using (
  bucket_id = 'avatars' and auth.uid() is not null
);
