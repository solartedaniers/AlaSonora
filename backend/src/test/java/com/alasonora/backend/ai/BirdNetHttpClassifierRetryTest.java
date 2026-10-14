package com.alasonora.backend.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.alasonora.backend.config.AiProperties;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import tools.jackson.databind.json.JsonMapper;

/** Reintento corto ante el 502 del proxy de Render y error estable cuando el motor no despierta. */
class BirdNetHttpClassifierRetryTest {

    private static final String ANALYZE_OK = "{\"candidates\":[{\"scientific_name\":\"Cyanocitta cristata\",\"common_name\":\"Blue Jay\",\"confidence\":0.9}]}";
    private static final Duration ASYNC_TIMEOUT = Duration.ofSeconds(30);

    private HttpServer server;
    private final AtomicInteger analyzeCalls = new AtomicInteger();
    private volatile int failuresBeforeSuccess;

    @BeforeEach
    void startStubEngine() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/audio.wav", exchange -> respond(exchange, 200, "RIFF"));
        server.createContext("/analyze", exchange -> {
            boolean fail = analyzeCalls.incrementAndGet() <= failuresBeforeSuccess;
            respond(exchange, fail ? 502 : 200, fail ? "Bad Gateway" : ANALYZE_OK);
        });
        server.start();
    }

    @AfterEach
    void stopStubEngine() {
        server.stop(0);
    }

    @Test
    void retriesOnceAfterTransient502() {
        failuresBeforeSuccess = 1;
        List<RawClassificationCandidate> result = classifier().classify(request());
        assertEquals(2, analyzeCalls.get());
        assertEquals("Cyanocitta cristata", result.get(0).scientificName());
    }

    @Test
    void reportsEngineUnavailableWhenItStaysDown() {
        failuresBeforeSuccess = Integer.MAX_VALUE;
        assertThrows(AiEngineUnavailableException.class, () -> classifier().classify(request()));
        assertEquals(2, analyzeCalls.get());
    }

    private BirdNetHttpClassifier classifier() {
        String base = "http://127.0.0.1:" + server.getAddress().getPort();
        AiProperties.Engine engine = new AiProperties.Engine(base, "test-key", 2000, 0.1, 3, 1000, 1000, 1, 10, 1000);
        return new BirdNetHttpClassifier(new AiProperties(engine, null, null, null), JsonMapper.builder().build(), ASYNC_TIMEOUT);
    }

    private ClassificationRequest request() {
        String audioUrl = "http://127.0.0.1:" + server.getAddress().getPort() + "/audio.wav";
        return new ClassificationRequest(audioUrl, null, null, null);
    }

    private static void respond(HttpExchange exchange, int status, String body) throws IOException {
        exchange.getRequestBody().readAllBytes();
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
