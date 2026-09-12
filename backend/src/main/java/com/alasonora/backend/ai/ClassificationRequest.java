package com.alasonora.backend.ai;

import java.time.Instant;

/** Everything the bioacoustic engine needs to analyze one recording. Deliberately free of any JPA/DTO type so the `ai` package stays decoupled from the persistence and web layers. */
public record ClassificationRequest(String audioUrl, Double latitude, Double longitude, Instant recordedAt) {
}
