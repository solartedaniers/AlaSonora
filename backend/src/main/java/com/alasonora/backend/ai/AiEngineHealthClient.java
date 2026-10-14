package com.alasonora.backend.ai;

import java.time.Duration;

import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.alasonora.backend.config.AiProperties;

/**
 * Consulta el /health del motor con un timeout corto. Cada consulta, aunque falle, ya
 * despierta el servicio en Render; el cliente vuelve a preguntar hasta que esté listo.
 */
@Component
public class AiEngineHealthClient {

    private static final String HEALTH_PATH = "/health";

    private final RestClient healthClient;

    public AiEngineHealthClient(AiProperties aiProperties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        Duration timeout = Duration.ofMillis(aiProperties.engine().healthTimeoutMs());
        requestFactory.setConnectTimeout(timeout);
        requestFactory.setReadTimeout(timeout);
        this.healthClient = RestClient.builder()
            .baseUrl(aiProperties.engine().baseUrl())
            .requestFactory(requestFactory)
            .build();
    }

    public boolean isReady() {
        try {
            return healthClient.get().uri(HEALTH_PATH).retrieve().toBodilessEntity().getStatusCode().is2xxSuccessful();
        } catch (RestClientException ex) {
            return false;
        }
    }
}
