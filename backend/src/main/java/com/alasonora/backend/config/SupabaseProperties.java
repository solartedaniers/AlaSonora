package com.alasonora.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Credenciales de Supabase (Auth Admin API y Storage) y configuración de los buckets privados. */
@ConfigurationProperties(prefix = "supabase")
public record SupabaseProperties(String url, String serviceRoleKey, Storage storage) {

    /** Buckets y tiempo de vida de las URLs firmadas que el backend genera bajo demanda. */
    public record Storage(String recordingsBucket, String observerPhotosBucket, int signedUrlTtlSeconds) {
    }
}
