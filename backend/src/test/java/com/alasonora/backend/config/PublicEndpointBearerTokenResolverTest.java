package com.alasonora.backend.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class PublicEndpointBearerTokenResolverTest {

    private static final String TOKEN = "expired-or-invalid-token";

    private final PublicEndpointBearerTokenResolver resolver = new PublicEndpointBearerTokenResolver();

    private static MockHttpServletRequest request(String method, String uri) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        request.addHeader("Authorization", "Bearer " + TOKEN);
        return request;
    }

    @Test
    void ignoresTheTokenOnPublicReads() {
        assertThat(resolver.resolve(request("GET", "/api/species"))).isNull();
        assertThat(resolver.resolve(request("GET", "/api/species/42"))).isNull();
        assertThat(resolver.resolve(request("GET", "/api/network-stats"))).isNull();
        assertThat(resolver.resolve(request("GET", "/api/detections"))).isNull();
    }

    @Test
    void keepsReadingTheTokenEverywhereElse() {
        assertThat(resolver.resolve(request("GET", "/api/detections/mine"))).isEqualTo(TOKEN);
        assertThat(resolver.resolve(request("GET", "/api/detections/7"))).isEqualTo(TOKEN);
        assertThat(resolver.resolve(request("POST", "/api/detections"))).isEqualTo(TOKEN);
        assertThat(resolver.resolve(request("GET", "/api/profile/me"))).isEqualTo(TOKEN);
    }
}
