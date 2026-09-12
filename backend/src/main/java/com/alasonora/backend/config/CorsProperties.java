package com.alasonora.backend.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Typed binding for app.cors.* so spring-boot-configuration-processor emits
 * metadata for it — otherwise IDEs flag it as an unknown property, since a
 * raw @Value lookup has no associated metadata to validate against.
 */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(List<String> allowedOrigins) {
}
