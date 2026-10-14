package com.alasonora.backend.service;

import com.alasonora.backend.exception.ApiErrorMessages;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.alasonora.backend.dto.SpeciesDto;
import com.alasonora.backend.entity.IucnStatus;
import com.alasonora.backend.entity.Species;
import com.alasonora.backend.repository.SpeciesRepository;
import com.alasonora.backend.translation.SpeciesCommonNameTranslator;
import com.alasonora.backend.translation.SpeciesImageResolver;
import com.alasonora.backend.translation.SpeciesVocalizationReferenceResolver;

@Service
public class SpeciesService {

    private final SpeciesRepository speciesRepository;
    private final SpeciesCommonNameTranslator nameTranslator;
    private final SpeciesImageResolver imageResolver;
    private final SpeciesVocalizationReferenceResolver vocalizationReferenceResolver;

    public SpeciesService(
        SpeciesRepository speciesRepository,
        SpeciesCommonNameTranslator nameTranslator,
        SpeciesImageResolver imageResolver,
        SpeciesVocalizationReferenceResolver vocalizationReferenceResolver
    ) {
        this.speciesRepository = speciesRepository;
        this.nameTranslator = nameTranslator;
        this.imageResolver = imageResolver;
        this.vocalizationReferenceResolver = vocalizationReferenceResolver;
    }

    public List<SpeciesDto> getAll() {
        return speciesRepository.findAll().stream().map(SpeciesDto::fromEntity).toList();
    }

    public SpeciesDto getById(Long id) {
        return SpeciesDto.fromEntity(findEntity(id));
    }

    Species findEntity(Long id) {
        return speciesRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, ApiErrorMessages.SPECIES_NOT_FOUND + id));
    }

    /**
     * Crecimiento del catálogo: reutilizo la especie por nombre científico o registro
     * una nueva con lo que reportó la IA. Los campos que el motor no da (estado UICN,
     * taxonomía) quedan con valores honestos de relleno, no adivinados, para que un
     * curador los complete sin que parezcan datos oficiales mientras tanto.
     */
    @Transactional
    public Species findOrCreateByScientificName(String scientificName, String commonNameEn) {
        Optional<Species> existing = speciesRepository.findByScientificNameIgnoreCase(scientificName);
        existing.filter(SpeciesService::lacksSpanishName).ifPresent(this::backfillSpanishName);
        return existing.orElseGet(() -> speciesRepository.save(newAutoRegisteredSpecies(scientificName, commonNameEn)));
    }

    /** Sin nombre en español: vacío o, en registros antiguos, igual al inglés. */
    static boolean lacksSpanishName(Species species) {
        String name = species.getCommonName();
        return name == null || name.isBlank() || name.equalsIgnoreCase(species.getCommonNameEn());
    }

    /**
     * Reintento en segundo plano de la traducción para especies que quedaron sin nombre en español
     * (Wikidata no respondió a tiempo). Solo ocurre cuando alguien vuelve a usar la especie y no
     * retrasa la clasificación en curso: si encuentra el nombre, actualiza la fila para la próxima vez.
     */
    private void backfillSpanishName(Species species) {
        Long id = species.getId();
        String scientificName = species.getScientificName();
        CompletableFuture.supplyAsync(() -> nameTranslator.translateToSpanish(scientificName))
            .thenAccept(name -> name.ifPresent(spanish -> speciesRepository.findById(id)
                .filter(SpeciesService::lacksSpanishName)
                .ifPresent(stored -> {
                    stored.setCommonName(spanish);
                    speciesRepository.save(stored);
                })));
    }

    private Species newAutoRegisteredSpecies(String scientificName, String commonNameEn) {
        Species species = new Species();
        species.setScientificName(scientificName);
        species.setCommonNameEn(commonNameEn);
        species.setIucnStatus(IucnStatus.NE);

        // Las tres llamadas externas (Wikidata, Wikimedia, Xeno-canto) son
        // independientes entre sí, así que se lanzan a la vez en vez de una
        // tras otra: el tiempo total queda acotado por la más lenta de las
        // tres, no por la suma (medido: de ~1.1-3.1s secuencial a ~0.6-1.7s
        // en paralelo con las mismas especies, ver informe).
        CompletableFuture<Optional<String>> commonNameFuture =
            CompletableFuture.supplyAsync(() -> nameTranslator.translateToSpanish(scientificName));
        CompletableFuture<Optional<String>> imageFuture =
            CompletableFuture.supplyAsync(() -> imageResolver.resolveImageUrl(scientificName));
        CompletableFuture<List<String>> vocalizationsFuture =
            CompletableFuture.supplyAsync(() -> vocalizationReferenceResolver.resolveTypicalVocalizations(scientificName));

        // Traducción dinámica vía Wikidata (sin diccionario local). Sin nombre en español lo dejo
        // vacío, nunca el inglés: el frontend muestra el nombre científico y el nombre se completa
        // después (backfillSpanishName). La columna es NOT NULL, por eso vacío y no null.
        species.setCommonName(commonNameFuture.join().orElse(""));
        // Foto de referencia real vía Wikimedia Commons; sin foto queda null y el frontend muestra su
        // ilustración con el aviso. Guardar una ruta de placeholder del frontend la rompía al cambiar.
        species.setImageUrl(imageFuture.join().orElse(null));
        // Tipos de vocalización típicos según Xeno-canto, resueltos una sola
        // vez aquí; nunca se vuelve a consultar por cada grabación del usuario.
        species.setTypicalVocalizations(String.join(", ", vocalizationsFuture.join()));

        return species;
    }
}
