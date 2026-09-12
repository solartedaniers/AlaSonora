package com.alasonora.backend.dto;

import com.alasonora.backend.entity.ObserverRole;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateProfileRequest(
    @NotBlank String displayName,
    String avatarUrl,
    @NotNull ObserverRole role,
    String institution,
    String orcidId,
    String stationName
) {
}
