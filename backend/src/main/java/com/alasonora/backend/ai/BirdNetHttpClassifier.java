package com.alasonora.backend.ai;

import java.time.Duration;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.alasonora.backend.config.AiProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import tools.jackson.databind.ObjectMapper;

/**
 * Adaptador que habla por HTTP con el microservicio BirdNET (Python/FastAPI).
 * Es la única clase que conoce su formato (multipart, cabecera X-Internal-Api-Key,
 * JSON snake_case); el resto depende solo de {@link BirdSoundClassifier}.
 */
@Component
public class BirdNetHttpClassifier implements BirdSoundClassifier {

    // Respuestas del proxy de Render mientras el servicio arranca o se cae: vale la pena reintentar.
    private static final Set<Integer> TRANSIENT_STATUSES = Set.of(502, 503, 504);

    private final RestClient engineClient;
    private final RestClient audioFetchClient;
    private final AiProperties.Engine engineProperties;
    private final ObjectMapper objectMapper;
    /** Tiempo total que puede durar una clasificación sin pasar el request-timeout asíncrono de Spring MVC. */
    private final Duration requestBudget;

    public BirdNetHttpClassifier(
        AiProperties aiProperties,
        ObjectMapper objectMapper,
        @Value("${spring.mvc.async.request-timeout}") Duration asyncRequestTimeout
    ) {
        this.engineProperties = aiProperties.engine();
        this.objectMapper = objectMapper;
        this.requestBudget = asyncRequestTimeout.minusMillis(engineProperties.asyncSafetyMarginMs());
        // Falla al arrancar si la configuración no cabe: mejor que un 503 de Spring en producción.
        long worstCaseMs = engineProperties.audioFetchTimeoutMs() + engineProperties.timeoutMs();
        if (worstCaseMs > requestBudget.toMillis()) {
            throw new IllegalStateException("ai.engine audio-fetch + engine timeouts (" + worstCaseMs
                + " ms) exceed the async request budget (" + requestBudget.toMillis() + " ms)");
        }

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(engineProperties.timeoutMs()));
        requestFactory.setReadTimeout(Duration.ofMillis(engineProperties.timeoutMs()));

        this.engineClient = RestClient.builder()
            .baseUrl(engineProperties.baseUrl())
            .requestFactory(requestFactory)
            .build();
        // Sin base URL: audioUrl siempre es una URL firmada absoluta de Supabase Storage.
        SimpleClientHttpRequestFactory audioFactory = new SimpleClientHttpRequestFactory();
        audioFactory.setConnectTimeout(Duration.ofMillis(engineProperties.audioFetchTimeoutMs()));
        audioFactory.setReadTimeout(Duration.ofMillis(engineProperties.audioFetchTimeoutMs()));
        this.audioFetchClient = RestClient.builder().requestFactory(audioFactory).build();
    }

    @Override
    public List<RawClassificationCandidate> classify(ClassificationRequest request) {
        long deadline = System.nanoTime() + requestBudget.toNanos();
        byte[] audioBytes = fetchAudio(request.audioUrl());

        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("audio", audioBytes).filename("recording.wav").contentType(MediaType.valueOf("audio/wav"));
        body.part("min_confidence", engineProperties.minConfidence());
        body.part("max_results", engineProperties.maxResults());
        if (request.latitude() != null) body.part("latitude", request.latitude());
        if (request.longitude() != null) body.part("longitude", request.longitude());
        if (request.recordedAt() != null) body.part("recorded_at", request.recordedAt().toString());
        MultiValueMap<String, ?> parts = body.build();

        for (int attempt = 0; ; attempt++) {
            try {
                return analyze(parts);
            } catch (RestClientResponseException ex) {
                if (ex.getStatusCode() == HttpStatusCode.valueOf(422)) {
                    throw new AudioQualityException(extractDetailMessage(ex));
                }
                if (!TRANSIENT_STATUSES.contains(ex.getStatusCode().value())) {
                    throw new AudioClassificationException("Bioacoustic engine call failed", ex);
                }
                if (!waitBeforeRetry(attempt, deadline)) throw new AiEngineUnavailableException("Bioacoustic engine unavailable", ex);
            } catch (ResourceAccessException ex) {
                // Conexión rechazada o sin respuesta: el motor está apagado o despertando.
                if (!waitBeforeRetry(attempt, deadline)) throw new AiEngineUnavailableException("Bioacoustic engine unreachable", ex);
            } catch (RestClientException ex) {
                throw new AudioClassificationException("Bioacoustic engine call failed", ex);
            }
        }
    }

    private List<RawClassificationCandidate> analyze(MultiValueMap<String, ?> parts) {
        EngineResponse response = engineClient.post()
            .uri("/analyze")
            .header("X-Internal-Api-Key", engineProperties.apiKey())
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(parts)
            .retrieve()
            .body(EngineResponse.class);

        if (response == null || response.candidates() == null) return List.of();

        // BirdNET da la confianza en 0-1; el resto de la app trabaja en 0-100.
        return response.candidates().stream()
            .map(c -> new RawClassificationCandidate(c.scientificName(), c.commonName(), c.confidence() * 100))
            .toList();
    }

    /**
     * Reintento corto: solo si quedan intentos y si la espera más un intento completo caben antes
     * del límite. Así una caída lenta (timeout) nunca se duplica y la respuesta llega antes del 503 de Spring.
     */
    private boolean waitBeforeRetry(int attempt, long deadline) {
        if (attempt >= engineProperties.retryAttempts()) return false;
        long needed = Duration.ofMillis(engineProperties.retryBackoffMs() + engineProperties.timeoutMs()).toNanos();
        if (System.nanoTime() + needed > deadline) return false;
        try {
            Thread.sleep(engineProperties.retryBackoffMs());
            return true;
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    // El motor Python devuelve {"detail": "<mensaje en español>"} en un 422
    // cuando el audio no pasa el control de calidad; se propaga tal cual.
    private String extractDetailMessage(RestClientResponseException ex) {
        try {
            return objectMapper.readTree(ex.getResponseBodyAsByteArray()).path("detail").asString(ex.getMessage());
        } catch (Exception parseError) {
            return ex.getMessage();
        }
    }

    private byte[] fetchAudio(String audioUrl) {
        try {
            byte[] bytes = audioFetchClient.get().uri(audioUrl).retrieve().body(byte[].class);
            if (bytes == null) throw new AudioClassificationException("Recording download returned no data", null);
            return bytes;
        } catch (RestClientException ex) {
            throw new AudioClassificationException("Could not download the recording to classify", ex);
        }
    }

    private record EngineResponse(List<EngineCandidate> candidates) {
    }

    private record EngineCandidate(
        @JsonProperty("scientific_name") String scientificName,
        @JsonProperty("common_name") String commonName,
        double confidence
    ) {
    }
}
