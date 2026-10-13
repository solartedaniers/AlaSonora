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
 * Borra grabaciones subidas que nunca se guardaron como detección (resultado
 * descartado o clasificación fallida). No toco objetos más nuevos que min-age:
 * pueden ser de un resultado en revisión o de una sincronización offline en curso.
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

    // También corre poco después de cada arranque: Render duerme la instancia inactiva
    // y una hora fija podría saltarse por días.
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

    /** @return cantidad de objetos borrados */
    int cleanUp(Instant now) {
        Instant createdBefore = now.minus(properties.minAge());
        int removed = 0;
        List<String> batch;
        do {
            batch = repository.findOrphans(bucket, createdBefore, properties.batchSize());
            if (batch.isEmpty()) break;
            int deleted = remover.remove(bucket, batch);
            // Si no se borró nada, Storage rechazó el lote: paro en vez de releerlo para siempre.
            if (deleted == 0) break;
            removed += deleted;
        } while (batch.size() == properties.batchSize());
        return removed;
    }
}
