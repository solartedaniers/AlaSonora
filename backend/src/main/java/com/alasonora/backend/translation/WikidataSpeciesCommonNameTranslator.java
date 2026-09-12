package com.alasonora.backend.translation;

import java.time.Duration;
import java.util.Optional;

import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.alasonora.backend.config.SpeciesTranslationProperties;
import tools.jackson.databind.JsonNode;

/**
 * Traduce nombres comunes al español consultando Wikidata en tiempo real por
 * el nombre científico (propiedad P225, "taxon name"). No hay diccionario
 * local: cualquier ave con entrada en Wikidata (prácticamente todas las
 * especies catalogadas) se resuelve sin tocar código ni mantener una lista
 * propia de traducciones.
 */
@Component
public class WikidataSpeciesCommonNameTranslator implements SpeciesCommonNameTranslator {

    private static final String SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
    private static final String USER_AGENT = "AlaSonora/1.0 (bioacoustic bird identification app)";

    private final RestClient restClient;

    public WikidataSpeciesCommonNameTranslator(SpeciesTranslationProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(properties.timeoutMs()));
        requestFactory.setReadTimeout(Duration.ofMillis(properties.timeoutMs()));

        this.restClient = RestClient.builder()
            .baseUrl(SPARQL_ENDPOINT)
            .requestFactory(requestFactory)
            .defaultHeader("User-Agent", USER_AGENT)
            .build();
    }

    @Override
    public Optional<String> translateToSpanish(String scientificName) {
        try {
            JsonNode response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                    .queryParam("query", sparqlQuery(scientificName))
                    .queryParam("format", "json")
                    .build())
                .retrieve()
                .body(JsonNode.class);
            return extractLabel(response);
        } catch (RestClientException ex) {
            // Falla de red o límite de tasa de Wikidata: se degrada en
            // silencio porque el llamador ya tiene un respaldo (nombre en inglés).
            return Optional.empty();
        }
    }

    private String sparqlQuery(String scientificName) {
        String escaped = scientificName.replace("\"", "\\\"");
        return """
            SELECT ?commonNameEs WHERE {
              ?taxon wdt:P225 "%s".
              ?taxon rdfs:label ?commonNameEs.
              FILTER(LANG(?commonNameEs) = "es")
            }
            LIMIT 1
            """.formatted(escaped);
    }

    private Optional<String> extractLabel(JsonNode response) {
        if (response == null) return Optional.empty();
        JsonNode bindings = response.path("results").path("bindings");
        if (!bindings.isArray() || bindings.isEmpty()) return Optional.empty();

        String label = bindings.get(0).path("commonNameEs").path("value").asString(null);
        return Optional.ofNullable(label).filter(value -> !value.isBlank());
    }
}
