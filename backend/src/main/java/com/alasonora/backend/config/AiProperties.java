package com.alasonora.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binding tipado de ai.*, agrupado en un record (engine/executor/catalog) en vez de
 * tres clases. Igual que {@link CorsProperties}: spring-boot-configuration-processor
 * necesita un binding tipado para generar los metadatos del IDE.
 */
@ConfigurationProperties(prefix = "ai")
public record AiProperties(Engine engine, Executor executor, Catalog catalog, Photo photo) {

    /**
     * Datos de conexión al motor bioacústico Python/FastAPI. healthTimeoutMs es corto (solo despierta y pregunta);
     * el reintento solo ocurre ante fallos rápidos y si aún cabe en el tiempo de la petición asíncrona.
     */
    public record Engine(
        String baseUrl,
        String apiKey,
        long timeoutMs,
        double minConfidence,
        int maxResults,
        long audioFetchTimeoutMs,
        long healthTimeoutMs,
        int retryAttempts,
        long retryBackoffMs,
        long asyncSafetyMarginMs
    ) {
    }

    /** Umbrales de clasificación de fotos; reutiliza la conexión del motor (baseUrl/apiKey/timeoutMs) porque es el mismo servicio Python, otro endpoint. */
    public record Photo(double minConfidence, int maxResults) {
    }

    /** Tamaño del pool bulkhead que aísla el trabajo de IA de los hilos de Tomcat. */
    public record Executor(int corePoolSize, int maxPoolSize, int queueCapacity) {
    }

    /** Aviso científico que acompaña a cada clasificación de IA. */
    public record Catalog(String disclaimer) {
    }
}
