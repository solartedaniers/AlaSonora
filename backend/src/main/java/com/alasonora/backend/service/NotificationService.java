package com.alasonora.backend.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.alasonora.backend.config.NotificationProperties;
import com.alasonora.backend.dto.GeoLocationDto;
import com.alasonora.backend.dto.NotificationDto;
import com.alasonora.backend.dto.NotificationFeedDto;
import com.alasonora.backend.dto.SpeciesDto;
import com.alasonora.backend.entity.Detection;
import com.alasonora.backend.entity.GeoLocation;
import com.alasonora.backend.entity.Profile;
import com.alasonora.backend.entity.Visibility;
import com.alasonora.backend.geo.ApproximateAreaResolver;
import com.alasonora.backend.repository.DetectionRepository;
import com.alasonora.backend.repository.ProfileRepository;

/**
 * Campana de avisos sin tabla propia: un aviso es una detección PUBLIC de otra persona, y "sin leer"
 * significa creada después de profiles.notifications_seen_at. Guardar una detección no escribe nada
 * por cada usuario, y el estado de leído es una sola fecha por cuenta (sirve en cualquier dispositivo).
 */
@Service
public class NotificationService {

    private final DetectionRepository detectionRepository;
    private final ProfileRepository profileRepository;
    private final ObserverNames observerNames;
    private final ApproximateAreaResolver areaResolver;
    private final NotificationProperties properties;
    private final Clock clock;

    public NotificationService(
        DetectionRepository detectionRepository,
        ProfileRepository profileRepository,
        ObserverNames observerNames,
        ApproximateAreaResolver areaResolver,
        NotificationProperties properties,
        Clock clock
    ) {
        this.detectionRepository = detectionRepository;
        this.profileRepository = profileRepository;
        this.observerNames = observerNames;
        this.areaResolver = areaResolver;
        this.properties = properties;
        this.clock = clock;
    }

    // Escribe solo la primera vez: una cuenta sin marca empieza con todo leído.
    @Transactional
    public NotificationFeedDto feedFor(UUID requesterId) {
        Instant seenAt = seenAtOf(requesterId);
        List<Detection> latest = detectionRepository.findLatestFromOthers(
            Visibility.PUBLIC, requesterId, PageRequest.of(0, properties.historySize()));
        Map<UUID, String> usernames = observerNames.usernamesOf(latest);
        List<NotificationDto> items = latest.stream()
            .map(detection -> toDto(detection, usernames, seenAt))
            .toList();
        long unread = detectionRepository.countByVisibilityAndOwnerIdNotAndCreatedAtAfter(Visibility.PUBLIC, requesterId, seenAt);
        return new NotificationFeedDto(unread, items);
    }

    /**
     * Al abrir la campana: todo lo publicado hasta ahora queda leído; el historial se conserva.
     * Transacción propia y corta, para que una recarga inmediata ya lea la marca guardada.
     */
    @Transactional
    public void markAllRead(UUID requesterId) {
        profileRepository.markNotificationsSeen(requesterId, clock.instant());
    }

    private Instant seenAtOf(UUID requesterId) {
        Instant now = clock.instant();
        // Sin perfil todavía (lo crea el registro): no hay nada que marcar, nada cuenta como sin leer.
        Profile profile = profileRepository.findById(requesterId).orElse(null);
        if (profile == null) return now;
        if (profile.getNotificationsSeenAt() != null) return profile.getNotificationsSeenAt();
        profileRepository.markNotificationsSeen(requesterId, now);
        return now;
    }

    private NotificationDto toDto(Detection detection, Map<UUID, String> usernames, Instant seenAt) {
        GeoLocation location = detection.getLocation();
        return new NotificationDto(
            detection.getId().toString(),
            ObserverNames.nameOf(detection, usernames),
            SpeciesDto.fromEntity(detection.getSpecies()),
            GeoLocationDto.fromEntity(location),
            areaOf(location),
            detection.getCreatedAt(),
            detection.getCreatedAt().isAfter(seenAt)
        );
    }

    private String areaOf(GeoLocation location) {
        if (location.getPlaceName() != null && !location.getPlaceName().isBlank()) return location.getPlaceName();
        return areaResolver.nearestArea(location.getLatitude(), location.getLongitude()).orElse(null);
    }
}
