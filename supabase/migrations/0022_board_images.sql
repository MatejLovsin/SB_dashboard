-- Boards, step 4: an idea can carry one image.
--
-- The row stores the storage object's PATH, never a URL. The bucket is
-- private, so the page asks for short-lived signed URLs when it loads (see
-- app/(app)/boards/[id]/page.tsx) and nothing public ever points at an image.
--
-- Object paths are `<user_id>/<board_id>/<node_id>-<timestamp>.<ext>`. The
-- first folder is the owner, which is what the storage policies check -- the
-- same owner-only rule as every table, applied to files.

alter table public.board_nodes
  add column image_path text;

-- Private bucket. 5 MB is generous: the browser downscales to ~1600 px JPEG
-- before uploading, which usually lands well under 1 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('board-images', 'board-images', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "board images: owner reads"
  on storage.objects for select to authenticated
  using (bucket_id = 'board-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "board images: owner uploads"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'board-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "board images: owner deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'board-images' and (storage.foldername(name))[1] = auth.uid()::text);
