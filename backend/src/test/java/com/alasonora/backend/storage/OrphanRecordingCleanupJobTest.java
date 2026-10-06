package com.alasonora.backend.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.alasonora.backend.config.OrphanRecordingCleanupProperties;
import com.alasonora.backend.config.SupabaseProperties;

class OrphanRecordingCleanupJobTest {

    private static final String BUCKET = "recordings";
    private static final Instant NOW = Instant.parse("2026-10-06T12:00:00Z");

    private final OrphanRecordingRepository repository = mock(OrphanRecordingRepository.class);
    private final SupabaseStorageObjectRemover remover = mock(SupabaseStorageObjectRemover.class);
    private final OrphanRecordingCleanupJob job = new OrphanRecordingCleanupJob(
        repository,
        remover,
        new OrphanRecordingCleanupProperties(true, Duration.ofHours(24), 2),
        new SupabaseProperties("https://x.supabase.co", "key", new SupabaseProperties.Storage(BUCKET, "observer-photos", 120))
    );

    @Test
    void onlyLooksAtObjectsOlderThanMinAge() {
        when(repository.findOrphans(any(), any(), eq(2))).thenReturn(List.of());

        assertEquals(0, job.cleanUp(NOW));
        verify(repository).findOrphans(BUCKET, NOW.minus(Duration.ofHours(24)), 2);
        verify(remover, never()).remove(any(), anyList());
    }

    @Test
    void deletesInBatchesUntilAPartialBatch() {
        when(repository.findOrphans(any(), any(), eq(2)))
            .thenReturn(List.of("u/1.wav", "u/2.wav"))
            .thenReturn(List.of("u/3.wav"));
        when(remover.remove(eq(BUCKET), anyList())).thenAnswer(call -> ((List<?>) call.getArgument(1)).size());

        assertEquals(3, job.cleanUp(NOW));
        verify(remover).remove(BUCKET, List.of("u/1.wav", "u/2.wav"));
        verify(remover).remove(BUCKET, List.of("u/3.wav"));
    }

    @Test
    void stopsWhenStorageDeletesNothing() {
        when(repository.findOrphans(any(), any(), eq(2))).thenReturn(List.of("u/1.wav", "u/2.wav"));
        when(remover.remove(eq(BUCKET), anyList())).thenReturn(0);

        assertEquals(0, job.cleanUp(NOW));
        verify(remover).remove(BUCKET, List.of("u/1.wav", "u/2.wav"));
    }
}
