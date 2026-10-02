package com.alasonora.backend.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.alasonora.backend.dto.UserStatsDto;
import com.alasonora.backend.repository.DetectionRepository;

@Service
public class UserStatsService {

    private final DetectionRepository detectionRepository;

    public UserStatsService(DetectionRepository detectionRepository) {
        this.detectionRepository = detectionRepository;
    }

    // La racha se cuenta en la zona horaria del usuario, no la del servidor:
    // una grabación a las 8 p. m. en Bogotá ya es "mañana" en UTC.
    public UserStatsDto getStats(UUID ownerId, ZoneId zone) {
        long totalRecordings = detectionRepository.countByOwnerId(ownerId);
        long distinctSpecies = detectionRepository.countDistinctSpeciesByOwnerId(ownerId);
        Double averageConfidence = detectionRepository.averageConfidenceByOwnerId(ownerId);
        double averageConfidencePct = averageConfidence != null ? Math.round(averageConfidence * 10) / 10.0 : 0.0;

        Set<LocalDate> recordingDays = detectionRepository.findRecordedAtByOwnerId(ownerId).stream()
            .map(recordedAt -> LocalDate.ofInstant(recordedAt, zone))
            .collect(Collectors.toSet());

        return new UserStatsDto(
            totalRecordings,
            distinctSpecies,
            averageConfidencePct,
            currentStreakDays(recordingDays, LocalDate.now(zone))
        );
    }

    // Si hoy todavía no hay grabación, la racha que terminó ayer sigue viva:
    // solo se rompe cuando pasa un día completo sin grabar.
    static int currentStreakDays(Set<LocalDate> recordingDays, LocalDate today) {
        LocalDate day = recordingDays.contains(today) ? today : today.minusDays(1);
        int streak = 0;
        while (recordingDays.contains(day)) {
            streak++;
            day = day.minusDays(1);
        }
        return streak;
    }
}
