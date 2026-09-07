/**
 * Saving a picture of the world. The file name carries the world's name
 * and the date, so a folder of photos stays readable.
 */

export function photoFileName(worldName: string, date = new Date()): string {
  const slug = worldName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const stamp = `${date.toISOString().slice(0, 10)}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
  return slug ? `mindcraft-photo-${slug}-${stamp}.png` : `mindcraft-photo-${stamp}.png`;
}

/** Hands the picture to the browser as a download. */
export function downloadPhoto(blob: Blob, worldName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = photoFileName(worldName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
