package com.alasonora.backend.dto;

public record NetworkStatsDto(
    long totalSpecies,
    long totalPublicDetections,
    long distinctObservers,
    double averageConfidencePct
) {
}
