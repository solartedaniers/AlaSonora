package com.alasonora.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Límite de los audios a clasificar (audio.upload.*). Supabase gratis acepta hasta 50 MB por archivo,
 * pero el motor de IA decodifica el audio completo en memoria en una instancia de 512 MB: el límite
 * real es menor y debe coincidir con environment.audioUpload del frontend.
 */
@ConfigurationProperties(prefix = "audio.upload")
public record AudioUploadProperties(long maxBytes) {
}
