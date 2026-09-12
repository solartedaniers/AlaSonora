package com.alasonora.backend.service;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.alasonora.backend.ai.AudioClassificationException;
import com.alasonora.backend.ai.BirdSoundClassifier;
import com.alasonora.backend.ai.ClassificationRequest;
import com.alasonora.backend.ai.RawClassificationCandidate;
import com.alasonora.backend.config.AiProperties;
import com.alasonora.backend.dto.ClassificationResultDto;
import com.alasonora.backend.dto.ClassifyDetectionRequest;
import com.alasonora.backend.dto.DetectionCandidateDto;
import com.alasonora.backend.dto.SpeciesDto;

/**
 * Orchestrates one classification: runs entirely on the dedicated
 * {@code aiTaskExecutor} bulkhead (never on a Tomcat request thread), calls
 * the {@link BirdSoundClassifier} port, and lets the catalog grow via
 * {@link SpeciesService} for any species BirdNET reports that isn't in the
 * database yet.
 */
@Service
public class DetectionClassificationService {

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
        List<RawClassificationCandidate> raw;
        try {
            raw = classifier.classify(new ClassificationRequest(
                request.audioUrl(),
                request.location().latitude(),
                request.location().longitude(),
                request.recordedAt()
            ));
        } catch (AudioClassificationException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The bioacoustic engine is unavailable", ex);
        }

        if (raw.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "No bird species were identified in this recording");
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
