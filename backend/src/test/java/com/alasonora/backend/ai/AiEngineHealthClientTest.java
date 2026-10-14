package com.alasonora.backend.ai;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import com.alasonora.backend.config.AiProperties;
import com.sun.net.httpserver.HttpServer;

/** La página de "despertando" de Render (HTML con 200) no cuenta como motor listo. */
class AiEngineHealthClientTest {

    private HttpServer server;

    @AfterEach
    void stop() {
        if (server != null) server.stop(0);
    }

    @Test
    void readyOnlyWithEngineJson() throws IOException {
        assertTrue(clientServing(200, "application/json", "{\"status\":\"ok\"}").isReady());
    }

    @Test
    void renderWakingPageIsNotReady() throws IOException {
        assertFalse(clientServing(200, "text/html", "<html><body>Service waking up…</body></html>").isReady());
    }

    @Test
    void serverErrorIsNotReady() throws IOException {
        assertFalse(clientServing(503, "text/plain", "Service Unavailable").isReady());
    }

    private AiEngineHealthClient clientServing(int status, String contentType, String body) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/health", exchange -> {
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", contentType);
            exchange.sendResponseHeaders(status, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        String base = "http://127.0.0.1:" + server.getAddress().getPort();
        AiProperties.Engine engine = new AiProperties.Engine(base, "key", 2000, 0.1, 3, 1000, 1000, 1, 10, 1000);
        return new AiEngineHealthClient(new AiProperties(engine, null, null, null));
    }
}
