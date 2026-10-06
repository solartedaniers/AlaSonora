package com.alasonora.backend.storage;

import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.alasonora.backend.config.OrphanRecordingCleanupProperties;
import com.alasonora.backend.config.SupabaseProperties;

/**
 * Deletes recordings that were uploaded but never saved as a detection
 * (result discarded or classification failed). Objects younger than min-age
 * are never touched: they may belong to a result the user is still reviewing
 * or to an offline-queue sync still in progress.
 */
@Component
@ConditionalOnProperty(prefix = "storage.orphan-recordings", name = "enabled", havingValue = "true")
public class OrphanRecordingCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(OrphanRecordingCleanupJob.class);

    private final OrphanRecordingRepository repository;
    private final SupabaseStorageObjectRemover remover;
    private final OrphanRecordingCleanupProperties properties;
    private final String bucket;

    public OrphanRecordingCleanupJob(
        OrphanRecordingRepository repository,
        SupabaseStorageObjectRemover remover,
        OrphanRecordingCleanupProperties properties,
        SupabaseProperties supabaseProperties
    ) {
        this.repository = repository;
        this.remover = remover;
        this.properties = properties;
        this.bucket = supabaseProperties.storage().recordingsBucket();
    }

    // Also runs shortly after every start: an idle Render instance sleeps, so
    // a fixed time of day could be missed for days.
    @Scheduled(
        initialDelayString = "${storage.orphan-recordings.initial-delay}",
        fixedDelayString = "${storage.orphan-recordings.interval}"
    )
    void runScheduled() {
        try {
            int removed = cleanUp(Instant.now());
            if (removed > 0) log.info("Removed {} orphan recordings from bucket '{}'", removed, bucket);
        } catch (RuntimeException ex) {
            log.warn("Orphan recording cleanup failed; it will be retried on the next run", ex);
        }
    }

    /** @return number of objects deleted */
    int cleanUp(Instant now) {
        Instant createdBefore = now.minus(properties.minAge());
        int removed = 0;
        List<String> batch;
        do {
            batch = repository.findOrphans(bucket, createdBefore, properties.batchSize());
            if (batch.isEmpty()) break;
            int deleted = remover.remove(bucket, batch);
            // Nothing deleted means Storage rejected the batch: stop instead of re-reading it forever.
            if (deleted == 0) break;
            removed += deleted;
        } while (batch.size() == properties.batchSize());
        return removed;
    }
}
