package com.alasonora.backend.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;

/**
 * Ignora el token en los endpoints públicos. Sin esto, un token vencido o
 * inválido producía 401 incluso en rutas permitAll, porque Spring valida el
 * token antes de evaluar las reglas de acceso.
 */
public class PublicEndpointBearerTokenResolver implements BearerTokenResolver {

    private final BearerTokenResolver delegate = new DefaultBearerTokenResolver();

    @Override
    public String resolve(HttpServletRequest request) {
        return PublicEndpoints.READ_ONLY.matches(request) ? null : delegate.resolve(request);
    }
}
