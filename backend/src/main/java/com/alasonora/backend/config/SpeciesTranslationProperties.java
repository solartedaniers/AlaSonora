package com.alasonora.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binding tipado de species.translation.*: endpoint, User-Agent y timeout de la consulta a
 * Wikidata usada por {@link com.alasonora.backend.translation.WikidataSpeciesCommonNameTranslator}.
 */
@ConfigurationProperties(prefix = "species.translation")
public record SpeciesTranslationProperties(String endpoint, String userAgent, long timeoutMs) {
}
