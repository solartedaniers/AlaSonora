package com.alasonora.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Credencial y timeout para la API de Xeno-canto, usada solo como referencia de especie. */
@ConfigurationProperties(prefix = "xeno-canto")
public record XenoCantoProperties(String apiKey, long timeoutMs) {
}
