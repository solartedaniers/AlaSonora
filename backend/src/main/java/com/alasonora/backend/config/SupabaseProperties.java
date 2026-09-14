package com.alasonora.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Credenciales de la Supabase Auth Admin API, usadas solo por el panel de administración. */
@ConfigurationProperties(prefix = "supabase")
public record SupabaseProperties(String url, String serviceRoleKey) {
}
