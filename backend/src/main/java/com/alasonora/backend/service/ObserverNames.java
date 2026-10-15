package com.alasonora.backend.service;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.alasonora.backend.entity.Detection;
import com.alasonora.backend.entity.Profile;
import com.alasonora.backend.repository.ProfileRepository;

/** Nombre visible de cada observador: su usuario actual, o el nombre guardado con la detección si aún no tiene. */
@Component
public class ObserverNames {

    private final ProfileRepository profileRepository;

    public ObserverNames(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    /** Una sola consulta de perfiles para toda la lista. */
    public Map<UUID, String> usernamesOf(Collection<Detection> detections) {
        Set<UUID> owners = detections.stream().map(detection -> detection.getOwnerId()).collect(Collectors.toSet());
        Map<UUID, String> usernames = new HashMap<>();
        for (Profile profile : profileRepository.findAllById(owners)) {
            if (profile.getUsername() != null && !profile.getUsername().isBlank()) usernames.put(profile.getId(), profile.getUsername());
        }
        return usernames;
    }

    public static String nameOf(Detection detection, Map<UUID, String> usernames) {
        return usernames.getOrDefault(detection.getOwnerId(), detection.getObserverName());
    }
}
