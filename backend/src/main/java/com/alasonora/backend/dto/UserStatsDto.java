package com.alasonora.backend.dto;

public record UserStatsDto(
    long totalRecordings,
    long distinctSpecies,
    double averageConfidence,
    int activeStreakDays
) {
}
