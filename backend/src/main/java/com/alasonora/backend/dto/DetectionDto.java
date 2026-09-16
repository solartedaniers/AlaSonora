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
    Visibility visibility,
    // Foto que el propio observador adjuntó a ESTA detección puntual (nunca
    // la foto de referencia oficial de la especie); null si no subió ninguna.
    String observerPhotoUrl
) {

    // El caller resuelve las URLs firmadas (ver PrivateObjectSignedUrlResolver):
    // este DTO solo mapea, nunca llama a Supabase Storage.
    public static DetectionDto fromEntity(Detection detection, String signedAudioUrl, String signedObserverPhotoUrl) {
        return new DetectionDto(
            detection.getId().toString(),
            detection.getRecordedAt(),
            signedAudioUrl,
            detection.getDurationSeconds(),
            SpeciesDto.fromEntity(detection.getSpecies()),
            detection.getConfidence(),
            detection.getPeakFrequencyHz(),
            detection.getAlternatives().stream().map(DetectionCandidateDto::fromEntity).toList(),
            GeoLocationDto.fromEntity(detection.getLocation()),
            detection.getObserverName(),
            detection.getFieldNotes(),
            detection.getVisibility(),
            signedObserverPhotoUrl
        );
    }
}
