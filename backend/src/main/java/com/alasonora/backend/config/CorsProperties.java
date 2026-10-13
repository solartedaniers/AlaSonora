package com.alasonora.backend.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binding tipado de app.cors.* para que spring-boot-configuration-processor genere
 * sus metadatos; con un @Value suelto el IDE la marca como propiedad desconocida.
 */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(List<String> allowedOrigins) {
}
