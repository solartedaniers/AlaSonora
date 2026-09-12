package com.alasonora.backend.controller;

import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.alasonora.backend.dto.ProfileDto;
import com.alasonora.backend.dto.UpdateProfileRequest;
import com.alasonora.backend.service.ProfileService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/profile/me")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ProfileDto getMe(@AuthenticationPrincipal Jwt jwt) {
        return profileService.getOrCreate(UUID.fromString(jwt.getSubject()), jwt.getClaimAsString("email"));
    }

    @PutMapping
    public ProfileDto updateMe(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateProfileRequest request) {
        return profileService.update(UUID.fromString(jwt.getSubject()), request);
    }
}
