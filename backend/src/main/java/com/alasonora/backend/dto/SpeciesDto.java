package com.alasonora.backend.dto;

import java.util.Arrays;
import java.util.List;

import com.alasonora.backend.entity.IucnStatus;
import com.alasonora.backend.entity.Species;

public record SpeciesDto(
    String id,
    String commonName,
    String commonNameEn,
    String scientificName,
    String family,
    String order,
    IucnStatus iucnStatus,
    String imageUrl,
    String behaviorNotes,
    // Referencia externa (Xeno-canto), no un análisis de ninguna grabación
    // puntual; vacía cuando la fuente no reportó nada usable.
    List<String> typicalVocalizations
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
            species.getBehaviorNotes(),
            splitTypicalVocalizations(species.getTypicalVocalizations())
        );
    }

    private static List<String> splitTypicalVocalizations(String stored) {
        if (stored == null || stored.isBlank()) return List.of();
        return Arrays.stream(stored.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
