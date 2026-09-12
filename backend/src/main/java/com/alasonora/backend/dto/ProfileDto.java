package com.alasonora.backend.dto;

import com.alasonora.backend.entity.ObserverRole;
import com.alasonora.backend.entity.Profile;

public record ProfileDto(
    String id,
    String displayName,
    String avatarUrl,
    ObserverRole role,
    String institution,
    String orcidId,
    String stationName
) {

    public static ProfileDto fromEntity(Profile profile) {
        return new ProfileDto(
            profile.getId().toString(),
            profile.getDisplayName(),
            profile.getAvatarUrl(),
            profile.getRole(),
            profile.getInstitution(),
            profile.getOrcidId(),
            profile.getStationName()
        );
    }
}
