package com.alasonora.backend.dto;

import java.time.Instant;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ClassifyDetectionRequest(
    @NotBlank String audioUrl,
    @NotNull Instant recordedAt,
    // Opcional: si se conoce, acota los candidatos de BirdNET a esa región;
    // si falta, BirdNET usa su catálogo global.
    @Valid GeoLocationDto location
) {
}
