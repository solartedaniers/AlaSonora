package com.alasonora.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Typed binding for ai.* — grouped in one record (engine/executor/catalog)
 * instead of three separate classes, following the same rationale as
 * {@link CorsProperties}: spring-boot-configuration-processor needs a typed
 * binding to emit IDE metadata for these properties.
 */
@ConfigurationProperties(prefix = "ai")
public record AiProperties(Engine engine, Executor executor, Catalog catalog) {

    /** Connection details for the Python/FastAPI bioacoustic engine. */
    public record Engine(String baseUrl, String apiKey, long timeoutMs, double minConfidence, int maxResults) {
    }

    /** Sizing for the dedicated bulkhead thread pool that isolates AI work from Tomcat's request threads. */
    public record Executor(int corePoolSize, int maxPoolSize, int queueCapacity) {
    }

    /** Defaults applied when the catalog grows organically from an AI classification. */
    public record Catalog(String defaultSpeciesImageUrl, String disclaimer) {
    }
}
