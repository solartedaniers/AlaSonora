package com.alasonora.backend.dto;

import java.time.Instant;
import java.util.List;

import com.alasonora.backend.entity.Detection;
import com.alasonora.backend.entity.Visibility;

public record DetectionDto(
    String id,
    Instant recordedAt,
    String audioUrl,
    double durationSeconds,
    SpeciesDto species,
    double confidence,
    double peakFrequencyHz,
    List<DetectionCandidateDto> alternatives,
    GeoLocationDto location,
    String observerName,
    String fieldNotes,
    Visibility visibility
) {

    public static DetectionDto fromEntity(Detection detection) {
        return new DetectionDto(
            detection.getId().toString(),
            detection.getRecordedAt(),
            detection.getAudioUrl(),
            detection.getDurationSeconds(),
            SpeciesDto.fromEntity(detection.getSpecies()),
            detection.getConfidence(),
            detection.getPeakFrequencyHz(),
            detection.getAlternatives().stream().map(DetectionCandidateDto::fromEntity).toList(),
            GeoLocationDto.fromEntity(detection.getLocation()),
            detection.getObserverName(),
            detection.getFieldNotes(),
            detection.getVisibility()
        );
    }
}
