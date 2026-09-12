package com.alasonora.backend.ai;

import java.time.Duration;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.alasonora.backend.config.AiProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import tools.jackson.databind.ObjectMapper;

/**
 * Adapter that talks to the decoupled Python/FastAPI BirdNET microservice
 * over plain HTTP. This is the only class in the app aware of that engine's
 * wire format (multipart request, X-Internal-Api-Key header, snake_case
 * JSON) — everything else depends on {@link BirdSoundClassifier} only.
 */
@Component
public class BirdNetHttpClassifier implements BirdSoundClassifier {

    private final RestClient engineClient;
    private final RestClient audioFetchClient;
    private final AiProperties.Engine engineProperties;
    private final ObjectMapper objectMapper;

    public BirdNetHttpClassifier(AiProperties aiProperties, ObjectMapper objectMapper) {
        this.engineProperties = aiProperties.engine();
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(engineProperties.timeoutMs()));
        requestFactory.setReadTimeout(Duration.ofMillis(engineProperties.timeoutMs()));

        this.engineClient = RestClient.builder()
            .baseUrl(engineProperties.baseUrl())
            .requestFactory(requestFactory)
            .build();
        // No base URL: audioUrl is always an absolute Supabase Storage signed URL.
        this.audioFetchClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    @Override
    public List<RawClassificationCandidate> classify(ClassificationRequest request) {
        byte[] audioBytes = fetchAudio(request.audioUrl());

        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("audio", audioBytes).filename("recording.wav").contentType(MediaType.valueOf("audio/wav"));
        body.part("min_confidence", engineProperties.minConfidence());
        body.part("max_results", engineProperties.maxResults());
        if (request.latitude() != null) body.part("latitude", request.latitude());
        if (request.longitude() != null) body.part("longitude", request.longitude());
        if (request.recordedAt() != null) body.part("recorded_at", request.recordedAt().toString());

        try {
            EngineResponse response = engineClient.post()
                .uri("/analyze")
                .header("X-Internal-Api-Key", engineProperties.apiKey())
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .retrieve()
                .body(EngineResponse.class);

            if (response == null || response.candidates() == null) return List.of();

            // BirdNET's native confidence is 0-1; the rest of the app works in 0-100.
            return response.candidates().stream()
                .map(c -> new RawClassificationCandidate(c.scientificName(), c.commonName(), c.confidence() * 100))
                .toList();
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode() == HttpStatusCode.valueOf(422)) {
                throw new AudioQualityException(extractDetailMessage(ex));
            }
            throw new AudioClassificationException("Bioacoustic engine call failed", ex);
        } catch (RestClientException ex) {
            throw new AudioClassificationException("Bioacoustic engine call failed", ex);
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
