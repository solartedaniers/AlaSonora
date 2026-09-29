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
import tools.jackson.databind.ObjectMapper;

/**
 * Adapter that talks to the same decoupled Python/FastAPI AI engine as
 * {@link BirdNetHttpClassifier}, but to its separate photo-classification
 * endpoint — a different model, never touching the audio pipeline.
 */
@Component
public class BirdPhotoHttpClassifier implements BirdPhotoClassifier {

    private final RestClient engineClient;
    private final AiProperties.Engine engineProperties;
    private final AiProperties.Photo photoProperties;
    private final ObjectMapper objectMapper;

    public BirdPhotoHttpClassifier(AiProperties aiProperties, ObjectMapper objectMapper) {
        this.engineProperties = aiProperties.engine();
        this.photoProperties = aiProperties.photo();
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(engineProperties.timeoutMs()));
        requestFactory.setReadTimeout(Duration.ofMillis(engineProperties.timeoutMs()));

        this.engineClient = RestClient.builder()
            .baseUrl(engineProperties.baseUrl())
            .requestFactory(requestFactory)
            .build();
    }

    @Override
    public List<RawPhotoClassificationCandidate> classify(byte[] photoBytes) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("photo", photoBytes).filename("photo.jpg").contentType(MediaType.valueOf("image/jpeg"));
        body.part("min_confidence", photoProperties.minConfidence());
        body.part("max_results", photoProperties.maxResults());

        try {
            EngineResponse response = engineClient.post()
                .uri("/classify-photo")
                .header("X-Internal-Api-Key", engineProperties.apiKey())
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .retrieve()
                .body(EngineResponse.class);

            if (response == null || response.candidates() == null) return List.of();

            return response.candidates().stream()
                .map(c -> new RawPhotoClassificationCandidate(c.label(), c.confidence() * 100))
                .toList();
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode() == HttpStatusCode.valueOf(422)) {
                throw new NoBirdInPhotoException(extractDetailMessage(ex));
            }
            throw new PhotoClassificationException("Photo classification engine call failed", ex);
        } catch (RestClientException ex) {
            throw new PhotoClassificationException("Photo classification engine call failed", ex);
        }
    }

    private String extractDetailMessage(RestClientResponseException ex) {
        try {
            return objectMapper.readTree(ex.getResponseBodyAsByteArray()).path("detail").asString(ex.getMessage());
        } catch (Exception parseError) {
            return ex.getMessage();
        }
    }

    private record EngineResponse(List<EngineCandidate> candidates) {
    }

    private record EngineCandidate(String label, double confidence) {
    }
}
