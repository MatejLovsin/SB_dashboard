// Pictures from a phone camera are 4000+ px and several MB. Before uploading,
// shrink to a sensible longest edge and re-encode, so storage stays small and
// a board with a dozen images still loads quickly.

const MAX_EDGE = 1600;
const QUALITY = 0.85;

export async function downscaleImage(file: File): Promise<Blob> {
  // createImageBitmap applies EXIF orientation, so portrait photos stay upright.
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

  // Already small and already a JPEG: re-encoding would only lose quality.
  if (scale === 1 && file.type === 'image/jpeg' && file.size < 1_000_000) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // JPEG for photos; WebP for anything that may carry transparency. A browser
  // that cannot encode WebP hands back PNG, which the upload handles too.
  const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
  return blob ?? file;
}
