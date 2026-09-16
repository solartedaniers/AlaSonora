package com.alasonora.backend.storage;

/**
 * Puerto para convertir el path interno de un objeto en un bucket privado de
 * Supabase Storage (grabaciones, fotos del observador) en una URL firmada,
 * generada bajo demanda y con vencimiento corto. Nunca se persiste: se
 * resuelve de nuevo en cada solicitud.
 */
public interface PrivateObjectSignedUrlResolver {

    String resolveSignedUrl(String bucket, String storagePath, int ttlSeconds);
}
