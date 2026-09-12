package com.alasonora.backend.service;

import org.springframework.stereotype.Service;

import com.alasonora.backend.dto.NetworkStatsDto;
import com.alasonora.backend.entity.Visibility;
import com.alasonora.backend.repository.DetectionRepository;
import com.alasonora.backend.repository.SpeciesRepository;

@Service
public class NetworkStatsService {

    private final SpeciesRepository speciesRepository;
    private final DetectionRepository detectionRepository;

    public NetworkStatsService(SpeciesRepository speciesRepository, DetectionRepository detectionRepository) {
        this.speciesRepository = speciesRepository;
        this.detectionRepository = detectionRepository;
    }

    // Solo agrega datos de detecciones PUBLIC: nunca debe filtrar información
    // privada de un observador hacia este endpoint público y sin autenticar.
    public NetworkStatsDto getStats() {
        long totalSpecies = speciesRepository.count();
        long totalPublicDetections = detectionRepository.countByVisibility(Visibility.PUBLIC);
        long distinctObservers = detectionRepository.countDistinctOwnersByVisibility(Visibility.PUBLIC);
        Double averageConfidence = detectionRepository.averageConfidenceByVisibility(Visibility.PUBLIC);
        double averageConfidencePct = averageConfidence != null ? Math.round(averageConfidence * 10) / 10.0 : 0.0;

        return new NetworkStatsDto(totalSpecies, totalPublicDetections, distinctObservers, averageConfidencePct);
    }
}
