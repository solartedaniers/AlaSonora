package com.alasonora.backend.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Tarea de mantenimiento que borra grabaciones subidas a Storage pero nunca ligadas a una detección guardada. */
@ConfigurationProperties(prefix = "storage.orphan-recordings")
public record OrphanRecordingCleanupProperties(boolean enabled, Duration minAge, int batchSize) {
}
