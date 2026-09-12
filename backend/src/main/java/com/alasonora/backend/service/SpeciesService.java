package com.alasonora.backend.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.alasonora.backend.config.AiProperties;
import com.alasonora.backend.dto.SpeciesDto;
import com.alasonora.backend.entity.IucnStatus;
import com.alasonora.backend.entity.Species;
import com.alasonora.backend.entity.VocalizationType;
import com.alasonora.backend.repository.SpeciesRepository;
import com.alasonora.backend.translation.SpeciesCommonNameTranslator;

@Service
public class SpeciesService {

    private final SpeciesRepository speciesRepository;
    private final SpeciesCommonNameTranslator nameTranslator;
    private final AiProperties.Catalog catalogProperties;

    public SpeciesService(
        SpeciesRepository speciesRepository,
        SpeciesCommonNameTranslator nameTranslator,
        AiProperties aiProperties
    ) {
        this.speciesRepository = speciesRepository;
        this.nameTranslator = nameTranslator;
        this.catalogProperties = aiProperties.catalog();
    }

    public List<SpeciesDto> getAll() {
        return speciesRepository.findAll().stream().map(SpeciesDto::fromEntity).toList();
    }

    public SpeciesDto getById(Long id) {
        return SpeciesDto.fromEntity(findEntity(id));
    }

    Species findEntity(Long id) {
        return speciesRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Species not found: " + id));
    }

    /**
     * Organic catalog growth: reuses an existing species by scientific name,
     * or registers a new one from what the AI engine reported. Curated
     * fields the engine can't provide (IUCN status, vocalization type,
     * taxonomy) get honest placeholders rather than guessed values, so a
     * human curator can fill them in later without the data looking
     * authoritative in the meantime.
     */
    @Transactional
    public Species findOrCreateByScientificName(String scientificName, String commonNameEn) {
        return speciesRepository.findByScientificNameIgnoreCase(scientificName)
            .orElseGet(() -> speciesRepository.save(newAutoRegisteredSpecies(scientificName, commonNameEn)));
    }

    private Species newAutoRegisteredSpecies(String scientificName, String commonNameEn) {
        Species species = new Species();
        species.setScientificName(scientificName);
        species.setCommonNameEn(commonNameEn);
        // Traducción dinámica vía Wikidata (sin diccionario local); si no hay
        // entrada en español, se usa el nombre en inglés como respaldo.
        species.setCommonName(nameTranslator.translateToSpanish(scientificName).orElse(commonNameEn));
        species.setIucnStatus(IucnStatus.NE);
        species.setVocalizationType(VocalizationType.UNKNOWN);
        species.setImageUrl(catalogProperties.defaultSpeciesImageUrl());
        return species;
    }
}
