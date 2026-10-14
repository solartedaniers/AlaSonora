// Extensiones que acepto tal cual del nombre original; el resto se deduce del tipo MIME.
const SAFE_EXTENSION = /^[a-z0-9]{1,5}$/;
const MIME_EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const FALLBACK_EXTENSION = 'bin';

/**
 * Nombre seguro para un objeto de Storage: marca de tiempo y extensión en minúsculas, sin
 * espacios ni tildes del nombre original. Al ser único, la subida no necesita upsert.
 */
export function storageObjectName(file: File, prefix?: string): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  const extension = SAFE_EXTENSION.test(fromName) ? fromName : (MIME_EXTENSIONS[file.type] ?? FALLBACK_EXTENSION);
  return `${prefix ? `${prefix}-` : ''}${Date.now()}.${extension}`;
}
