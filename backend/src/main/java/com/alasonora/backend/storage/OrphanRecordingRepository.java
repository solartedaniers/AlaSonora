package com.alasonora.backend.storage;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Reads Supabase's own storage.objects table: the Storage REST API can only
 * list folder by folder and has no "not referenced by a detection" filter,
 * while this is a single anti-join in the same database.
 */
@Repository
public class OrphanRecordingRepository {

    private static final String FIND_ORPHANS = """
        select o.name
        from storage.objects o
        where o.bucket_id = ?
          and o.created_at < ?
          and not exists (select 1 from detections d where d.audio_storage_path = o.name)
        order by o.created_at
        limit ?
        """;

    private final JdbcTemplate jdbcTemplate;

    public OrphanRecordingRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<String> findOrphans(String bucket, Instant createdBefore, int limit) {
        return jdbcTemplate.queryForList(FIND_ORPHANS, String.class, bucket, Timestamp.from(createdBefore), limit);
    }
}
