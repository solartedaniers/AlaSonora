package com.alasonora.backend.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.alasonora.backend.dto.CreateDetectionRequest;
import com.alasonora.backend.dto.DetectionDto;
import com.alasonora.backend.entity.Detection;
import com.alasonora.backend.entity.DetectionCandidate;
import com.alasonora.backend.entity.Species;
import com.alasonora.backend.entity.Visibility;
import com.alasonora.backend.repository.DetectionRepository;

@Service
public class DetectionService {

    private final DetectionRepository detectionRepository;
    private final SpeciesService speciesService;

    public DetectionService(DetectionRepository detectionRepository, SpeciesService speciesService) {
        this.detectionRepository = detectionRepository;
        this.speciesService = speciesService;
    }

    public List<DetectionDto> getPublicDetections() {
        return detectionRepository.findByVisibility(Visibility.PUBLIC).stream().map(DetectionDto::fromEntity).toList();
    }

    public List<DetectionDto> getMyDetections(UUID ownerId) {
        return detectionRepository.findByOwnerId(ownerId).stream().map(DetectionDto::fromEntity).toList();
    }

    public DetectionDto createDetection(UUID ownerId, CreateDetectionRequest request) {
        Detection detection = new Detection();
        detection.setOwnerId(ownerId);
        detection.setRecordedAt(request.recordedAt());
        detection.setAudioUrl(request.audioUrl());
        detection.setDurationSeconds(request.durationSeconds());
        detection.setSpecies(speciesService.findEntity(Long.valueOf(request.speciesId())));
        detection.setConfidence(request.confidence());
        detection.setPeakFrequencyHz(request.peakFrequencyHz());
        detection.setLocation(request.location().toEntity());
        detection.setObserverName(request.observerName());
        detection.setFieldNotes(request.fieldNotes());
        detection.setVisibility(request.visibility());

        if (request.alternatives() != null) {
            request.alternatives().forEach(candidate -> {
                DetectionCandidate entity = new DetectionCandidate();
                entity.setDetection(detection);
                Species species = speciesService.findEntity(Long.valueOf(candidate.speciesId()));
                entity.setSpecies(species);
                entity.setConfidence(candidate.confidence());
                detection.getAlternatives().add(entity);
            });
        }

        return DetectionDto.fromEntity(detectionRepository.save(detection));
    }
}
