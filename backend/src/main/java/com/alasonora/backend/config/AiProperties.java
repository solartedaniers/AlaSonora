package com.alasonora.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binding tipado de ai.*, agrupado en un record (engine/executor/catalog) en vez de
 * tres clases. Igual que {@link CorsProperties}: spring-boot-configuration-processor
 * necesita un binding tipado para generar los metadatos del IDE.
 */
@ConfigurationProperties(prefix = "ai")
public record AiProperties(Engine engine, Executor executor, Catalog catalog, Photo photo) {

    /** Datos de conexión al motor bioacústico Python/FastAPI. */
    public record Engine(String baseUrl, String apiKey, long timeoutMs, double minConfidence, int maxResults) {
    }

    /** Umbrales de clasificación de fotos; reutiliza la conexión del motor (baseUrl/apiKey/timeoutMs) porque es el mismo servicio Python, otro endpoint. */
    public record Photo(double minConfidence, int maxResults) {
    }

    /** Tamaño del pool bulkhead que aísla el trabajo de IA de los hilos de Tomcat. */
    public record Executor(int corePoolSize, int maxPoolSize, int queueCapacity) {
    }

    /** Valores por defecto cuando el catálogo crece a partir de una clasificación de IA. */
    public record Catalog(String defaultSpeciesImageUrl, String disclaimer) {
    }
}
