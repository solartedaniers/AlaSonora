package com.alasonora.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.alasonora.backend.entity.Species;
import com.alasonora.backend.repository.SpeciesRepository;
import com.alasonora.backend.translation.SpeciesCommonNameTranslator;
import com.alasonora.backend.translation.SpeciesImageResolver;
import com.alasonora.backend.translation.SpeciesVocalizationReferenceResolver;

/** Sin traducción ni foto: nunca guardo el nombre en inglés ni una ruta de placeholder. */
class SpeciesServiceTest {

    private final SpeciesRepository repository = mock(SpeciesRepository.class);
    private final SpeciesCommonNameTranslator translator = mock(SpeciesCommonNameTranslator.class);
    private final SpeciesImageResolver imageResolver = mock(SpeciesImageResolver.class);
    private final SpeciesVocalizationReferenceResolver vocalizations = mock(SpeciesVocalizationReferenceResolver.class);
    private final SpeciesService service = new SpeciesService(repository, translator, imageResolver, vocalizations);

    @Test
    void newSpeciesWithoutTranslationOrPhotoKeepsNameEmptyAndImageNull() {
        when(repository.findByScientificNameIgnoreCase("Icterus chrysater")).thenReturn(Optional.empty());
        when(repository.save(any(Species.class))).thenAnswer(call -> call.getArgument(0));
        when(translator.translateToSpanish("Icterus chrysater")).thenReturn(Optional.empty());
        when(imageResolver.resolveImageUrl("Icterus chrysater")).thenReturn(Optional.empty());
        when(vocalizations.resolveTypicalVocalizations("Icterus chrysater")).thenReturn(List.of());

        Species saved = service.findOrCreateByScientificName("Icterus chrysater", "Yellow-backed Oriole");

        assertEquals("", saved.getCommonName());
        assertEquals("Yellow-backed Oriole", saved.getCommonNameEn());
        assertNull(saved.getImageUrl());
    }

    @Test
    void newSpeciesUsesSpanishNameWhenAvailable() {
        when(repository.findByScientificNameIgnoreCase("Icterus chrysater")).thenReturn(Optional.empty());
        when(repository.save(any(Species.class))).thenAnswer(call -> call.getArgument(0));
        when(translator.translateToSpanish("Icterus chrysater")).thenReturn(Optional.of("Turpial dorsidorado"));
        when(imageResolver.resolveImageUrl("Icterus chrysater")).thenReturn(Optional.empty());
        when(vocalizations.resolveTypicalVocalizations("Icterus chrysater")).thenReturn(List.of());

        assertEquals("Turpial dorsidorado", service.findOrCreateByScientificName("Icterus chrysater", "Yellow-backed Oriole").getCommonName());
    }

    @Test
    void detectsMissingSpanishName() {
        assertTrue(SpeciesService.lacksSpanishName(species("", "Yellow-backed Oriole")));
        assertTrue(SpeciesService.lacksSpanishName(species("Yellow-backed Oriole", "Yellow-backed Oriole")));
        assertFalse(SpeciesService.lacksSpanishName(species("Turpial dorsidorado", "Yellow-backed Oriole")));
    }

    private static Species species(String commonName, String commonNameEn) {
        Species species = new Species();
        species.setCommonName(commonName);
        species.setCommonNameEn(commonNameEn);
        return species;
    }
}
