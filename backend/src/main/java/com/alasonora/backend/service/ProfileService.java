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
    private final UsernameService usernameService;

    public ProfileService(ProfileRepository profileRepository, UsernameService usernameService) {
        this.profileRepository = profileRepository;
        this.usernameService = usernameService;
    }

    // Supabase Auth crea el usuario; la fila de profiles la creo aquí en el primer
    // acceso, porque aún no hay un hook de registro.
    public ProfileDto getOrCreate(UUID id, String email) {
        Profile profile = profileRepository.findById(id).orElseGet(() -> {
            Profile created = new Profile();
            created.setId(id);
            created.setDisplayName(email);
            created.setUsername(usernameService.generateFrom(email));
            created.setRole(DEFAULT_ROLE);
            return profileRepository.save(created);
        });
        // Cuentas anteriores al nombre de usuario que la migración no alcanzó: le asigno uno libre.
        if (profile.getUsername() == null || profile.getUsername().isBlank()) {
            profile.setUsername(usernameService.generateFrom(email));
            profile = profileRepository.save(profile);
        }
        return ProfileDto.fromEntity(profile);
    }

    public ProfileDto update(UUID id, UpdateProfileRequest request) {
        String username = usernameService.requireUsable(request.username(), id);
        Profile profile = profileRepository.findById(id).orElseGet(() -> {
            Profile created = new Profile();
            created.setId(id);
            created.setDisplayName(username);
            return created;
        });
        // El nombre completo ya no se edita: la app identifica a cada observador por su usuario.
        profile.setUsername(username);
        // Sin foto nueva conservo la actual (antes un null del panel de administración la borraba).
        if (request.avatarUrl() != null) profile.setAvatarUrl(request.avatarUrl());
        profile.setRole(request.role());
        profile.setInstitution(request.institution());
        profile.setOrcidId(request.orcidId());
        profile.setStationName(request.stationName());
        return ProfileDto.fromEntity(profileRepository.save(profile));
    }
}
