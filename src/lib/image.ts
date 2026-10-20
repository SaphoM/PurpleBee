/**
 * Client-side profile picture preparation.
 *
 * Phone photos are often 5–15 MB and 4000px+, which either failed the old
 * 5 MB guard outright or uploaded a file some browsers cannot even decode
 * (HEIC on Chrome) — both surfaced as "I can't change the avatar". Every
 * avatar upload is downscaled to a small JPEG first; undecodable formats
 * throw so callers can show a clear error instead of storing an image that
 * <img> tags can never render.
 */
export const AVATAR_MAX_DIM = 512;
export const RAW_IMAGE_LIMIT_BYTES = 15 * 1024 * 1024;

export interface PreparedImage {
  blob: Blob;
  ext: string;
}

export async function prepareAvatarImage(file: File): Promise<PreparedImage> {
  // createImageBitmap throws for formats the browser can't decode (e.g.
  // HEIC in Chrome) — exactly the case we must not upload silently.
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, AVATAR_MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');
    // Flatten transparency onto white so JPEG never renders transparent
    // pixels as black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );
    if (!blob) throw new Error('Image encoding failed');
    return { blob, ext: 'jpg' };
  } finally {
    bitmap.close();
  }
}
