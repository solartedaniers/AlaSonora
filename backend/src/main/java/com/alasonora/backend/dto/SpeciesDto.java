package com.alasonora.backend.dto;

import com.alasonora.backend.entity.IucnStatus;
import com.alasonora.backend.entity.Species;
import com.alasonora.backend.entity.VocalizationType;

public record SpeciesDto(
    String id,
    String commonName,
    String commonNameEn,
    String scientificName,
    String family,
    String order,
    IucnStatus iucnStatus,
    String imageUrl,
    VocalizationType vocalizationType,
    String behaviorNotes
) {

    public static SpeciesDto fromEntity(Species species) {
        return new SpeciesDto(
            species.getId().toString(),
            species.getCommonName(),
            species.getCommonNameEn(),
            species.getScientificName(),
            species.getFamily(),
            species.getOrder(),
            species.getIucnStatus(),
            species.getImageUrl(),
            species.getVocalizationType(),
            species.getBehaviorNotes()
        );
    }
}
