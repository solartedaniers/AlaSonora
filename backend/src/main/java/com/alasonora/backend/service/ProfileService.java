package com.alasonora.backend.service;

import java.util.UUID;

import org.springframework.stereotype.Service;

import com.alasonora.backend.dto.ProfileDto;
import com.alasonora.backend.dto.UpdateProfileRequest;
import com.alasonora.backend.entity.ObserverRole;
import com.alasonora.backend.entity.Profile;
import com.alasonora.backend.repository.ProfileRepository;

@Service
public class ProfileService {

    private static final ObserverRole DEFAULT_ROLE = ObserverRole.HOBBYIST;

    private final ProfileRepository profileRepository;

    public ProfileService(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    // Supabase Auth creates the user; the profiles row is created lazily on
    // first access here since there is no separate sign-up hook yet.
    public ProfileDto getOrCreate(UUID id, String defaultDisplayName) {
        Profile profile = profileRepository.findById(id).orElseGet(() -> {
            Profile created = new Profile();
            created.setId(id);
            created.setDisplayName(defaultDisplayName);
            created.setRole(DEFAULT_ROLE);
            return profileRepository.save(created);
        });
        return ProfileDto.fromEntity(profile);
    }

    public ProfileDto update(UUID id, UpdateProfileRequest request) {
        Profile profile = profileRepository.findById(id).orElseGet(() -> {
            Profile created = new Profile();
            created.setId(id);
            return created;
        });
        profile.setDisplayName(request.displayName());
        profile.setAvatarUrl(request.avatarUrl());
        profile.setRole(request.role());
        profile.setInstitution(request.institution());
        profile.setOrcidId(request.orcidId());
        profile.setStationName(request.stationName());
        return ProfileDto.fromEntity(profileRepository.save(profile));
    }
}
