package com.alasonora.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Typed binding for species.translation.* — timeout de la consulta externa a
 * Wikidata usada por {@link com.alasonora.backend.translation.WikidataSpeciesCommonNameTranslator}.
 */
@ConfigurationProperties(prefix = "species.translation")
public record SpeciesTranslationProperties(long timeoutMs) {
}
