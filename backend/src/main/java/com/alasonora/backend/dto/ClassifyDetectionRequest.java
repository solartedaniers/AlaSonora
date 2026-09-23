package com.alasonora.backend.dto;

import java.time.Instant;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ClassifyDetectionRequest(
    @NotBlank String audioUrl,
    @NotNull Instant recordedAt,
    // Optional: when known, narrows BirdNET's candidates to that region;
    // when absent, BirdNET falls back to its global species catalog.
    @Valid GeoLocationDto location
) {
}
