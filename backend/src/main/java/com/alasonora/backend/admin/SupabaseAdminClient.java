package com.alasonora.backend.admin;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.alasonora.backend.config.SupabaseProperties;

/**
 * Adapter que habla con la Supabase Auth Admin API: única clase que conoce su
 * formato (headers apikey/Authorization con la service_role key, payloads
 * snake_case). Se usa solo para lo que debe ocurrir realmente en Supabase
 * Auth (alta de usuarios y baneo de sesión); todo lo demás del panel de
 * administración se resuelve contra la tabla profiles de este backend.
 */
@Component
public class SupabaseAdminClient {

    // Supabase no tiene un "baneo permanente" explícito; una duración muy
    // larga (100 años) es el patrón que documentan para lograrlo.
    private static final String PERMANENT_BAN_DURATION = "876000h";
    private static final String NO_BAN_DURATION = "none";

    private final RestClient restClient;

    public SupabaseAdminClient(SupabaseProperties supabaseProperties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));

        this.restClient = RestClient.builder()
            .baseUrl(supabaseProperties.url() + "/auth/v1/admin")
            .requestFactory(requestFactory)
            .defaultHeader("apikey", supabaseProperties.serviceRoleKey())
            .defaultHeader("Authorization", "Bearer " + supabaseProperties.serviceRoleKey())
            .build();
    }

    public UUID createUser(String email, String password) {
        try {
            SupabaseUserResponse response = restClient.post()
                .uri("/users")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("email", email, "password", password, "email_confirm", true))
                .retrieve()
                .body(SupabaseUserResponse.class);
            if (response == null) throw new SupabaseAdminException("Supabase returned no user", null);
            return UUID.fromString(response.id());
        } catch (RestClientException ex) {
            throw new SupabaseAdminException("Could not create the user in Supabase Auth", ex);
        }
    }

    public void setBanned(UUID userId, boolean banned) {
        try {
            restClient.put()
                .uri("/users/{id}", userId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("ban_duration", banned ? PERMANENT_BAN_DURATION : NO_BAN_DURATION))
                .retrieve()
                .toBodilessEntity();
        } catch (RestClientException ex) {
            throw new SupabaseAdminException("Could not update the user's ban status in Supabase Auth", ex);
        }
    }

    private record SupabaseUserResponse(String id) {
    }
}
