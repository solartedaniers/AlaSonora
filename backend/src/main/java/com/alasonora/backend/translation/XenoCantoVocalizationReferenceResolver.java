package com.alasonora.backend.translation;

import java.time.Duration;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.alasonora.backend.config.XenoCantoProperties;
import tools.jackson.databind.JsonNode;

/**
 * Deriva los tipos de vocalización típicos de una especie a partir de las
 * grabaciones catalogadas en Xeno-canto (song, call, duet, etc.). Es
 * metadata de referencia de la especie -- nunca un análisis de la grabación
 * puntual del usuario -- por eso se resuelve una sola vez, al auto-registrar
 * la especie, igual que {@link WikimediaCommonsSpeciesImageResolver}.
 */
@Component
public class XenoCantoVocalizationReferenceResolver implements SpeciesVocalizationReferenceResolver {

    private static final String API_ENDPOINT = "https://xeno-canto.org/api/3/recordings";
    private static final int MAX_TYPES = 6;
    // Valores que Xeno-canto usa como marcador de "no clasificado", no como
    // un tipo de vocalización real.
    private static final Set<String> NON_VOCALIZATION_TYPES = Set.of("", "uncertain");
    // Un type que solo aparece una vez suele ser una anotación de texto
    // libre del grabador (typos, notas en español, etc.); que se repita
    // confirma que es un tipo real y no ruido.
    private static final int MIN_OCCURRENCES = 2;

    private final RestClient restClient;
    private final String apiKey;

    public XenoCantoVocalizationReferenceResolver(XenoCantoProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(properties.timeoutMs()));
        requestFactory.setReadTimeout(Duration.ofMillis(properties.timeoutMs()));

        this.apiKey = properties.apiKey();
        this.restClient = RestClient.builder()
            .baseUrl(API_ENDPOINT)
            .requestFactory(requestFactory)
            .build();
    }

    @Override
    public List<String> resolveTypicalVocalizations(String scientificName) {
        try {
            JsonNode response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                    .queryParam("query", "sp:\"%s\"".formatted(scientificName))
                    .queryParam("key", apiKey)
                    .build())
                .retrieve()
                .body(JsonNode.class);
            return extractFrequentTypes(response);
        } catch (RestClientException ex) {
            // Falla de red o especie sin grabaciones en Xeno-canto: se
            // degrada en silencio, la sección de referencia simplemente no
            // se muestra.
            return List.of();
        }
    }

    private List<String> extractFrequentTypes(JsonNode response) {
        if (response == null) return List.of();
        JsonNode recordings = response.path("recordings");
        if (!recordings.isArray()) return List.of();

        Map<String, Integer> occurrences = new LinkedHashMap<>();
        for (JsonNode recording : recordings) {
            for (String rawType : recording.path("type").asString("").split(",")) {
                String type = rawType.trim().toLowerCase();
                if (NON_VOCALIZATION_TYPES.contains(type)) continue;
                occurrences.merge(type, 1, (current, added) -> current + added);
            }
        }

        return occurrences.entrySet().stream()
            .filter(entry -> entry.getValue() >= MIN_OCCURRENCES)
            .sorted(Comparator.<Map.Entry<String, Integer>>comparingInt(entry -> entry.getValue()).reversed())
            .limit(MAX_TYPES)
            .map(entry -> entry.getKey())
            .toList();
    }
}
