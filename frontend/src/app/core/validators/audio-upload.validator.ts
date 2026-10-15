import { environment } from '../../../environments/environment';

const { maxBytes, extensions } = environment.audioUpload;

/** Tope en MB tal como lo leen el texto de ayuda y el error (mismo valor que valida el backend). */
export const AUDIO_UPLOAD_MAX_MB = Math.round(maxBytes / (1024 * 1024));

/** Valor del atributo accept del selector de archivos, derivado de las extensiones permitidas. */
export const AUDIO_UPLOAD_ACCEPT = extensions.map((ext) => `.${ext}`).join(',');

export type AudioUploadProblem = 'unsupported' | 'tooLarge';

/** Reviso extensión y tamaño antes de subir; el backend vuelve a validar el contenido real. */
export function audioUploadProblem(file: File): AudioUploadProblem | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!file.name.includes('.') || !extensions.includes(extension)) return 'unsupported';
  return file.size > maxBytes ? 'tooLarge' : null;
}
