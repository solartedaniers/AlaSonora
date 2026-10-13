package com.alasonora.backend.ai;

import java.time.Instant;

/** Todo lo que el motor bioacústico necesita para analizar una grabación. Sin tipos JPA/DTO a propósito, para que `ai` no dependa de persistencia ni de web. */
public record ClassificationRequest(String audioUrl, Double latitude, Double longitude, Instant recordedAt) {
}
