package com.alasonora.backend.dto;

import java.util.List;

/** Resultado de POST /api/detections/classify, con la forma que el frontend reenvía tal cual a POST /api/detections. */
public record ClassificationResultDto(
    SpeciesDto species,
    double confidence,
    List<DetectionCandidateDto> alternatives,
    String disclaimer
) {
}
