package com.alasonora.backend.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Maintenance job that deletes recordings uploaded to Storage but never linked to a saved detection. */
@ConfigurationProperties(prefix = "storage.orphan-recordings")
public record OrphanRecordingCleanupProperties(boolean enabled, Duration minAge, int batchSize) {
}
