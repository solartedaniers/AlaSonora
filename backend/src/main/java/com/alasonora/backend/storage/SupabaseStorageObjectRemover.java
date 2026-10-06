package com.alasonora.backend.storage;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.alasonora.backend.config.SupabaseProperties;

/** Deletes Storage objects through the Storage API, which removes both the file and its metadata row. */
@Component
public class SupabaseStorageObjectRemover {

    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    private final RestClient restClient;

    public SupabaseStorageObjectRemover(SupabaseProperties properties) {
        // JDK client: it sends a request body with DELETE, which the Storage API requires.
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory();
        requestFactory.setReadTimeout(TIMEOUT);
        this.restClient = RestClient.builder()
            .baseUrl(properties.url() + "/storage/v1")
            .requestFactory(requestFactory)
            .defaultHeader("apikey", properties.serviceRoleKey())
            .defaultHeader("Authorization", "Bearer " + properties.serviceRoleKey())
            .build();
    }

    /** @return how many objects Storage reports as deleted */
    public int remove(String bucket, List<String> objectNames) {
        List<?> deleted = restClient.method(HttpMethod.DELETE)
            .uri("/object/" + bucket)
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of("prefixes", objectNames))
            .retrieve()
            .body(List.class);
        return deleted == null ? 0 : deleted.size();
    }
}
