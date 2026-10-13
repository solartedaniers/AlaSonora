package com.alasonora.backend.dto;

import java.util.List;

/** Resultado de POST /api/photo-classifications, con la forma de ClassificationResultDto (mejor resultado + alternativas) para reutilizar la misma tarjeta en el frontend. */
public record PhotoClassificationResultDto(
    PhotoClassificationCandidateDto top,
    List<PhotoClassificationCandidateDto> alternatives
) {
}
