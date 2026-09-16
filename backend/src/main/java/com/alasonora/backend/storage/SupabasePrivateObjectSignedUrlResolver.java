package com.alasonora.backend.storage;

import java.time.Duration;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.alasonora.backend.config.SupabaseProperties;

/**
 * Firma URLs de objetos privados (grabaciones, fotos del observador) contra
 * la Supabase Storage Admin API, con la misma service_role key que
 * {@link com.alasonora.backend.admin.SupabaseAdminClient} usa para la Auth
 * Admin API. Un único cliente HTTP reutilizable por bucket, en vez de una
 * clase por cada tipo de objeto privado que el backend necesite servir.
 */
@Component
public class SupabasePrivateObjectSignedUrlResolver implements PrivateObjectSignedUrlResolver {

    private final RestClient restClient;
    private final String storageBaseUrl;

    public SupabasePrivateObjectSignedUrlResolver(SupabaseProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));

        this.storageBaseUrl = properties.url() + "/storage/v1";
        this.restClient = RestClient.builder()
            .baseUrl(storageBaseUrl)
            .requestFactory(requestFactory)
            .defaultHeader("apikey", properties.serviceRoleKey())
            .defaultHeader("Authorization", "Bearer " + properties.serviceRoleKey())
            .build();
    }

    @Override
    public String resolveSignedUrl(String bucket, String storagePath, int ttlSeconds) {
        try {
            // storagePath viene de nuestro propio patrón de subida
            // ("{ownerId}/{...}"), nunca de texto libre del usuario, así que
            // concatenarlo es seguro: no hay caracteres que requieran
            // escapado y una plantilla "{bucket}/{path}" de RestClient
            // codificaría la barra interna del path como %2F.
            SignedUrlResponse response = restClient.post()
                .uri("/object/sign/" + bucket + "/" + storagePath)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("expiresIn", ttlSeconds))
                .retrieve()
                .body(SignedUrlResponse.class);
            if (response == null || response.signedURL() == null) {
                throw new SignedUrlException("Supabase returned no signed URL for " + bucket + "/" + storagePath, null);
            }
            return storageBaseUrl + response.signedURL();
        } catch (RestClientException | IllegalArgumentException ex) {
            // IllegalArgumentException también se captura aquí: la lanza el
            // propio cliente HTTP si supabase.url no está configurada (URI no
            // absoluta), antes de que exista una request que RestClientException
            // pudiera envolver.
            throw new SignedUrlException("Could not sign the URL for " + bucket + "/" + storagePath, ex);
        }
    }

    private record SignedUrlResponse(String signedURL) {
    }
}
