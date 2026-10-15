package com.alasonora.backend.admin;

import com.alasonora.backend.exception.ApiErrorMessages;

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
import com.alasonora.backend.service.UsernameService;

@Service
public class AdminUserService {

    private static final ObserverRole DEFAULT_ROLE = ObserverRole.HOBBYIST;

    private final SupabaseAdminClient supabaseAdminClient;
    private final ProfileRepository profileRepository;
    private final UsernameService usernameService;

    public AdminUserService(SupabaseAdminClient supabaseAdminClient, ProfileRepository profileRepository, UsernameService usernameService) {
        this.supabaseAdminClient = supabaseAdminClient;
        this.profileRepository = profileRepository;
        this.usernameService = usernameService;
    }

    public List<ProfileDto> listUsers() {
        return profileRepository.findAll().stream().map(ProfileDto::fromEntity).toList();
    }

    // El usuario se crea primero en Supabase Auth (única fuente de verdad para
    // login) y luego se refleja de inmediato en profiles, sin esperar al alta
    // perezosa que hace ProfileController en el primer login.
    public ProfileDto createUser(CreateUserRequest request) {
        // Valido el usuario antes de crear la cuenta en Supabase: así un nombre repetido no deja una cuenta a medias.
        String username = usernameService.requireUsable(request.username(), null);
        UUID userId = supabaseAdminClient.createUser(request.email(), request.password());

        Profile profile = new Profile();
        profile.setId(userId);
        profile.setDisplayName(username);
        profile.setUsername(username);
        profile.setRole(DEFAULT_ROLE);
        profile.setSystemRole(request.systemRole());
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
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, ApiErrorMessages.USER_NOT_FOUND));
    }
}
