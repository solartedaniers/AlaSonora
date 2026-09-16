package com.alasonora.backend.dto;

import java.time.Instant;
import java.util.List;

import com.alasonora.backend.entity.Visibility;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record CreateDetectionRequest(
    @NotBlank String speciesId,
    @NotNull Instant recordedAt,
    // Object key dentro del bucket privado "recordings", nunca una URL
    // firmada: el backend la genera bajo demanda al leer la detección.
    String audioStoragePath,
    @PositiveOrZero double durationSeconds,
    @DecimalMin("0") @DecimalMax("100") double confidence,
    double peakFrequencyHz,
    List<@Valid CandidateInput> alternatives,
    @NotNull @Valid GeoLocationDto location,
    String observerName,
    String fieldNotes,
    @NotNull Visibility visibility
) {

    public record CandidateInput(
        @NotBlank String speciesId,
        @DecimalMin("0") @DecimalMax("100") double confidence
    ) {
    }
}
