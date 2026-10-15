package com.alasonora.backend.config;

import org.springframework.http.HttpMethod;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;

/**
 * Lectura pública sin sesión. Una sola definición la usan las reglas de
 * acceso y el resolvedor del token, para que nunca se desincronicen.
 */
public final class PublicEndpoints {

    public static final RequestMatcher READ_ONLY = new OrRequestMatcher(
        PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/api/species/**"),
        PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/api/network-stats"),
        // Solo el listado público (?visibility=public); /mine y /{id} son otras rutas.
        PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/api/detections"),
        // Disponibilidad del nombre de usuario: se consulta en el registro, antes de tener sesión.
        PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/api/usernames/availability")
    );

    private PublicEndpoints() {
    }
}
