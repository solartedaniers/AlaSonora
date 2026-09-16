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
 * Busca una foto de referencia en Wikimedia Commons (API pública, gratuita,
 * sin API key) por nombre científico. Igual que
 * {@link WikidataSpeciesCommonNameTranslator}, sin catálogo local: cualquier
 * especie con una foto subida a Commons (la gran mayoría) se resuelve en
 * tiempo real.
 */
@Component
public class WikimediaCommonsSpeciesImageResolver implements SpeciesImageResolver {

    private static final String API_ENDPOINT = "https://commons.wikimedia.org/w/api.php";
    private static final String USER_AGENT = "AlaSonora/1.0 (bioacoustic bird identification app)";
    private static final int THUMBNAIL_WIDTH_PX = 800;

    private final RestClient restClient;

    public WikimediaCommonsSpeciesImageResolver(SpeciesTranslationProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(properties.timeoutMs()));
        requestFactory.setReadTimeout(Duration.ofMillis(properties.timeoutMs()));

        this.restClient = RestClient.builder()
            .baseUrl(API_ENDPOINT)
            .requestFactory(requestFactory)
            .defaultHeader("User-Agent", USER_AGENT)
            .build();
    }

    @Override
    public Optional<String> resolveImageUrl(String scientificName) {
        try {
            JsonNode response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                    .queryParam("action", "query")
                    .queryParam("generator", "search")
                    .queryParam("gsrnamespace", "6")
                    .queryParam("gsrsearch", "intitle:\"%s\" filetype:bitmap".formatted(scientificName))
                    .queryParam("gsrlimit", "1")
                    .queryParam("prop", "imageinfo")
                    .queryParam("iiprop", "url")
                    .queryParam("iiurlwidth", String.valueOf(THUMBNAIL_WIDTH_PX))
                    .queryParam("format", "json")
                    .build())
                .retrieve()
                .body(JsonNode.class);
            return extractThumbnailUrl(response);
        } catch (RestClientException ex) {
            // Falla de red o límite de tasa de Commons: se degrada en
            // silencio porque el llamador ya tiene un respaldo (placeholder).
            return Optional.empty();
        }
    }

    private Optional<String> extractThumbnailUrl(JsonNode response) {
        if (response == null) return Optional.empty();
        JsonNode pages = response.path("query").path("pages");
        if (!pages.isObject() || pages.isEmpty()) return Optional.empty();

        JsonNode firstPage = pages.values().iterator().next();
        JsonNode imageInfo = firstPage.path("imageinfo");
        if (!imageInfo.isArray() || imageInfo.isEmpty()) return Optional.empty();

        String thumbUrl = imageInfo.get(0).path("thumburl").asString(null);
        return Optional.ofNullable(thumbUrl).filter(value -> !value.isBlank());
    }
}
