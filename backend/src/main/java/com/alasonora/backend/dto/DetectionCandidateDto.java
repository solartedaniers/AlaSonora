package com.alasonora.backend.dto;

import com.alasonora.backend.entity.DetectionCandidate;

public record DetectionCandidateDto(SpeciesDto species, double confidence) {

    public static DetectionCandidateDto fromEntity(DetectionCandidate candidate) {
        return new DetectionCandidateDto(SpeciesDto.fromEntity(candidate.getSpecies()), candidate.getConfidence());
    }
}
