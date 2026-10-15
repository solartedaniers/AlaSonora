package com.alasonora.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Campana de avisos (notifications.*): tamaño del historial y radio para nombrar la zona aproximada. */
@ConfigurationProperties(prefix = "notifications")
public record NotificationProperties(int historySize, double areaMaxDistanceKm) {
}
