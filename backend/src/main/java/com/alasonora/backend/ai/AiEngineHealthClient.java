package com.alasonora.backend.ai;

import java.time.Duration;

import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.alasonora.backend.config.AiProperties;

/**
 * Consulta el /health del motor. Cada consulta, aunque falle, ya despierta el servicio en Render;
 * su timeout (ai.engine.health-timeout-ms) deja que Render retenga la petición mientras arranca.
 * Solo se llama cuando un usuario usa la app: no hay ninguna consulta programada.
 */
@Component
public class AiEngineHealthClient {

    private static final String HEALTH_PATH = "/health";
    private static final String HEALTHY = "ok";

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

    /**
     * Listo solo si responde el JSON del motor ({"status":"ok"}): mientras despierta, Render puede
     * devolver su propia página HTML con un 200, y eso no significa que el motor ya arrancó.
     */
    public boolean isReady() {
        try {
            HealthResponse health = healthClient.get().uri(HEALTH_PATH)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .body(HealthResponse.class);
            return health != null && HEALTHY.equals(health.status());
        } catch (RestClientException ex) {
            return false;
        }
    }

    private record HealthResponse(String status) {
    }
}
