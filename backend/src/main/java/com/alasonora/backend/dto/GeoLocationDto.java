package com.alasonora.backend.dto;

import com.alasonora.backend.entity.GeoLocation;

public record GeoLocationDto(
    double latitude,
    double longitude,
    Double altitudeMeters,
    String placeName
) {

    public static GeoLocationDto fromEntity(GeoLocation location) {
        return new GeoLocationDto(
            location.getLatitude(),
            location.getLongitude(),
            location.getAltitudeMeters(),
            location.getPlaceName()
        );
    }

    public GeoLocation toEntity() {
        GeoLocation location = new GeoLocation();
        location.setLatitude(latitude);
        location.setLongitude(longitude);
        location.setAltitudeMeters(altitudeMeters);
        location.setPlaceName(placeName);
        return location;
    }
}
