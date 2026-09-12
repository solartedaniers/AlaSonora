package com.alasonora.backend.dto;

import java.util.List;

/** Result of POST /api/detections/classify, shaped so the frontend can reuse the same fields it already sends back to POST /api/detections. */
public record ClassificationResultDto(
    SpeciesDto species,
    double confidence,
    List<DetectionCandidateDto> alternatives,
    String disclaimer
) {
}
