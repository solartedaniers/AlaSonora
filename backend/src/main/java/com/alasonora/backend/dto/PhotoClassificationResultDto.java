package com.alasonora.backend.dto;

import java.util.List;

/** Result of POST /api/photo-classifications, shaped the same way as ClassificationResultDto (top result + ranked alternatives) so the frontend can reuse the same result-card UI pattern. */
public record PhotoClassificationResultDto(
    PhotoClassificationCandidateDto top,
    List<PhotoClassificationCandidateDto> alternatives
) {
}
