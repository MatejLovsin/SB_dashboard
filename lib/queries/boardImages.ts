import type { Client } from './fitness';

// Images on board ideas live in the private `board-images` bucket (migration
// 0022). Rows store the object path; pages turn paths into signed URLs.

const BUCKET = 'board-images';

/** Long enough for a board left open all day; the page re-signs on every load. */
const SIGNED_FOR_SECONDS = 12 * 60 * 60;

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

async function ownerId(client: Client): Promise<string> {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  const id = data.session?.user.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

/** Uploads an idea's image and returns its object path. */
export async function uploadNodeImage(
  client: Client,
  input: { boardId: string; nodeId: string; image: Blob },
): Promise<string> {
  const ext = EXT[input.image.type] ?? 'jpg';
  // The first folder must be the owner: that is what the storage policies check.
  const path = `${await ownerId(client)}/${input.boardId}/${input.nodeId}-${Date.now()}.${ext}`;
  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, input.image, { contentType: input.image.type, upsert: false });
  if (error) throw error;
  return path;
}

/** Signed URLs by path. Paths that fail to sign are simply left out. */
export async function signImages(client: Client, paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await client.storage.from(BUCKET).createSignedUrls(paths, SIGNED_FOR_SECONDS);
  if (error) throw error;
  const urls: Record<string, string> = {};
  for (const s of data ?? []) if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
  return urls;
}

export async function removeImages(client: Client, paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { data, error } = await client.storage.from(BUCKET).remove(paths);
  if (error) throw error;
  // Storage reports success even when a policy lets nothing be deleted; the
  // list of removed objects is the only honest signal.
  if ((data?.length ?? 0) < paths.length) {
    throw new Error(`Removed ${data?.length ?? 0} of ${paths.length} image(s)`);
  }
}

/** Every image under a board — called before the board itself is deleted. */
export async function removeBoardImages(client: Client, boardId: string): Promise<void> {
  const folder = `${await ownerId(client)}/${boardId}`;
  const { data, error } = await client.storage.from(BUCKET).list(folder, { limit: 1000 });
  if (error) throw error;
  await removeImages(client, (data ?? []).map((o) => `${folder}/${o.name}`));
}
