package com.alasonora.backend.service;

import com.alasonora.backend.exception.ApiErrorMessages;
import com.alasonora.backend.exception.ApiErrorCode;
import com.alasonora.backend.exception.CodedResponseStatusException;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.alasonora.backend.ai.AiEngineUnavailableException;
import com.alasonora.backend.ai.AudioClassificationException;
import com.alasonora.backend.ai.AudioQualityException;
import com.alasonora.backend.ai.BirdSoundClassifier;
import com.alasonora.backend.ai.ClassificationRequest;
import com.alasonora.backend.ai.RawClassificationCandidate;
import com.alasonora.backend.config.AiProperties;
import com.alasonora.backend.dto.ClassificationResultDto;
import com.alasonora.backend.dto.ClassifyDetectionRequest;
import com.alasonora.backend.dto.DetectionCandidateDto;
import com.alasonora.backend.dto.GeoLocationDto;
import com.alasonora.backend.dto.SpeciesDto;

/**
 * Orquesta una clasificación: corre en el bulkhead {@code aiTaskExecutor} (nunca en un
 * hilo de Tomcat), llama al puerto {@link BirdSoundClassifier} y deja crecer el catálogo
 * con {@link SpeciesService} para las especies de BirdNET que aún no están en la base.
 */
@Service
public class DetectionClassificationService {

    private static final Logger log = LoggerFactory.getLogger(DetectionClassificationService.class);

    private final BirdSoundClassifier classifier;
    private final SpeciesService speciesService;
    private final Executor aiTaskExecutor;
    private final AiProperties.Catalog catalogProperties;

    public DetectionClassificationService(
        BirdSoundClassifier classifier,
        SpeciesService speciesService,
        @Qualifier("aiTaskExecutor") Executor aiTaskExecutor,
        AiProperties aiProperties
    ) {
        this.classifier = classifier;
        this.speciesService = speciesService;
        this.aiTaskExecutor = aiTaskExecutor;
        this.catalogProperties = aiProperties.catalog();
    }

    public CompletableFuture<ClassificationResultDto> classify(ClassifyDetectionRequest request) {
        return CompletableFuture.supplyAsync(() -> runClassification(request), aiTaskExecutor);
    }

    private ClassificationResultDto runClassification(ClassifyDetectionRequest request) {
        GeoLocationDto location = request.location();
        List<RawClassificationCandidate> raw;
        try {
            raw = classifier.classify(new ClassificationRequest(
                request.audioUrl(),
                location != null ? location.latitude() : null,
                location != null ? location.longitude() : null,
                request.recordedAt()
            ));
        } catch (AudioQualityException ex) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, ex.getMessage(), ex);
        } catch (AiEngineUnavailableException ex) {
            // Código estable: el frontend espera a que el motor despierte y reintenta solo.
            log.warn("AI engine unavailable: {}", ex.getMessage());
            throw new CodedResponseStatusException(HttpStatus.BAD_GATEWAY, ApiErrorMessages.BIOACOUSTIC_ENGINE_UNAVAILABLE, ApiErrorCode.AI_ENGINE_UNAVAILABLE);
        } catch (AudioClassificationException ex) {
            log.warn("Classification failed", ex);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, ApiErrorMessages.BIOACOUSTIC_ENGINE_UNAVAILABLE, ex);
        }

        if (raw.isEmpty()) {
            throw new CodedResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, ApiErrorMessages.NO_SPECIES_IN_RECORDING, ApiErrorCode.NO_SPECIES_IDENTIFIED);
        }

        List<DetectionCandidateDto> ranked = raw.stream()
            .map(candidate -> new DetectionCandidateDto(
                SpeciesDto.fromEntity(speciesService.findOrCreateByScientificName(candidate.scientificName(), candidate.commonName())),
                candidate.confidence()
            ))
            .toList();

        DetectionCandidateDto top = ranked.get(0);
        List<DetectionCandidateDto> alternatives = ranked.subList(1, ranked.size());
        return new ClassificationResultDto(top.species(), top.confidence(), alternatives, catalogProperties.disclaimer());
    }
}
