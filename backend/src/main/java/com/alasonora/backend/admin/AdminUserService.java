package com.alasonora.backend.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.alasonora.backend.dto.CreateUserRequest;
import com.alasonora.backend.dto.ProfileDto;
import com.alasonora.backend.entity.ObserverRole;
import com.alasonora.backend.entity.Profile;
import com.alasonora.backend.entity.SystemRole;
import com.alasonora.backend.repository.ProfileRepository;

@Service
public class AdminUserService {

    private static final ObserverRole DEFAULT_ROLE = ObserverRole.HOBBYIST;

    private final SupabaseAdminClient supabaseAdminClient;
    private final ProfileRepository profileRepository;

    public AdminUserService(SupabaseAdminClient supabaseAdminClient, ProfileRepository profileRepository) {
        this.supabaseAdminClient = supabaseAdminClient;
        this.profileRepository = profileRepository;
    }

    public List<ProfileDto> listUsers() {
        return profileRepository.findAll().stream().map(ProfileDto::fromEntity).toList();
    }

    // El usuario se crea primero en Supabase Auth (única fuente de verdad para
    // login) y luego se refleja de inmediato en profiles, sin esperar al alta
    // perezosa que hace ProfileController en el primer login.
    public ProfileDto createUser(CreateUserRequest request) {
        UUID userId = supabaseAdminClient.createUser(request.email(), request.password());

        Profile profile = new Profile();
        profile.setId(userId);
        profile.setDisplayName(request.displayName());
        profile.setRole(DEFAULT_ROLE);
        return ProfileDto.fromEntity(profileRepository.save(profile));
    }

    public ProfileDto setSuspended(UUID userId, boolean suspended) {
        Profile profile = findProfile(userId);
        supabaseAdminClient.setBanned(userId, suspended);
        profile.setSuspended(suspended);
        return ProfileDto.fromEntity(profileRepository.save(profile));
    }

    public ProfileDto setSystemRole(UUID userId, SystemRole systemRole) {
        Profile profile = findProfile(userId);
        profile.setSystemRole(systemRole);
        return ProfileDto.fromEntity(profileRepository.save(profile));
    }

    private Profile findProfile(UUID userId) {
        return profileRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
