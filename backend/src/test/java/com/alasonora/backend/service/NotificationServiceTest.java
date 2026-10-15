package com.alasonora.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.alasonora.backend.config.NotificationProperties;
import com.alasonora.backend.dto.NotificationFeedDto;
import com.alasonora.backend.entity.Detection;
import com.alasonora.backend.entity.GeoLocation;
import com.alasonora.backend.entity.Profile;
import com.alasonora.backend.entity.Species;
import com.alasonora.backend.entity.Visibility;
import com.alasonora.backend.geo.ApproximateAreaResolver;
import com.alasonora.backend.repository.DetectionRepository;
import com.alasonora.backend.repository.ProfileRepository;

/** Sin leer = creada después de la marca; abrir la campana mueve la marca; la zona sale del lugar conocido más cercano. */
class NotificationServiceTest {

    private static final UUID ME = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OTHER = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final Instant NOW = Instant.parse("2026-10-20T15:00:00Z");
    private static final Instant SEEN = NOW.minusSeconds(3600);

    private final DetectionRepository detections = mock(DetectionRepository.class);
    private final ProfileRepository profiles = mock(ProfileRepository.class);
    private final NotificationProperties properties = new NotificationProperties(30, 60);
    private final NotificationService service = new NotificationService(
        detections, profiles, new ObserverNames(profiles), new ApproximateAreaResolver(properties), properties,
        Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void marksOnlyDetectionsAfterTheSeenMarkAsUnread() {
        Profile me = profile(ME, "omairalimas05", SEEN);
        when(profiles.findById(ME)).thenReturn(Optional.of(me));
        when(profiles.findAllById(any())).thenReturn(List.of(profile(OTHER, "solartedaniers", null)));
        Detection fresh = detection(1L, SEEN.plusSeconds(600), 1.18, -77.26, null);
        Detection old = detection(2L, SEEN.minusSeconds(600), 1.18, -77.26, "Laguna de la Cocha");
        when(detections.findLatestFromOthers(eq(Visibility.PUBLIC), eq(ME), any())).thenReturn(List.of(fresh, old));
        when(detections.countByVisibilityAndOwnerIdNotAndCreatedAtAfter(Visibility.PUBLIC, ME, SEEN)).thenReturn(1L);

        NotificationFeedDto feed = service.feedFor(ME);

        assertEquals(1, feed.unreadCount());
        assertTrue(feed.items().get(0).unread());
        assertFalse(feed.items().get(1).unread());
        assertEquals("solartedaniers", feed.items().get(0).observerName());
        // Sin nombre de lugar: zona aproximada por coordenadas; con nombre: se respeta el guardado.
        assertEquals("Pasto, Nariño", feed.items().get(0).area());
        assertEquals("Laguna de la Cocha", feed.items().get(1).area());
    }

    @Test
    void openingTheBellMovesTheMarkToNow() {
        service.markAllRead(ME);

        verify(profiles).markNotificationsSeen(ME, NOW);
    }

    @Test
    void accountWithoutMarkStartsWithEverythingRead() {
        when(profiles.findById(ME)).thenReturn(Optional.of(profile(ME, "omairalimas05", null)));
        when(detections.findLatestFromOthers(eq(Visibility.PUBLIC), eq(ME), any())).thenReturn(List.of());

        service.feedFor(ME);

        verify(profiles).markNotificationsSeen(ME, NOW);
        verify(detections).countByVisibilityAndOwnerIdNotAndCreatedAtAfter(Visibility.PUBLIC, ME, NOW);
    }

    @Test
    void farFromKnownPlacesHasNoArea() {
        assertEquals(Optional.empty(), new ApproximateAreaResolver(properties).nearestArea(0.0, -100.0));
    }

    private static Profile profile(UUID id, String username, Instant seenAt) {
        Profile profile = new Profile();
        profile.setId(id);
        profile.setUsername(username);
        profile.setNotificationsSeenAt(seenAt);
        return profile;
    }

    private static Detection detection(long id, Instant createdAt, double latitude, double longitude, String placeName) {
        Species species = new Species();
        species.setId(7L);
        species.setCommonName("Turpial dorsidorado");
        species.setScientificName("Icterus chrysater");
        GeoLocation location = new GeoLocation();
        location.setLatitude(latitude);
        location.setLongitude(longitude);
        location.setPlaceName(placeName);
        Detection detection = new Detection();
        detection.setId(id);
        detection.setOwnerId(OTHER);
        detection.setSpecies(species);
        detection.setLocation(location);
        detection.setVisibility(Visibility.PUBLIC);
        detection.setCreatedAt(createdAt);
        return detection;
    }
}
