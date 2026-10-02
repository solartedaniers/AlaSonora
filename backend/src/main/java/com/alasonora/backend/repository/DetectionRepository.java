package com.alasonora.backend.repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.alasonora.backend.entity.Detection;
import com.alasonora.backend.entity.Visibility;

public interface DetectionRepository extends JpaRepository<Detection, Long> {

    List<Detection> findByVisibilityOrderByRecordedAtDesc(Visibility visibility);

    List<Detection> findByOwnerIdOrderByRecordedAtDesc(UUID ownerId);

    long countByVisibility(Visibility visibility);

    @Query("select count(distinct d.ownerId) from Detection d where d.visibility = :visibility")
    long countDistinctOwnersByVisibility(@Param("visibility") Visibility visibility);

    @Query("select avg(d.confidence) from Detection d where d.visibility = :visibility")
    Double averageConfidenceByVisibility(@Param("visibility") Visibility visibility);

    long countByOwnerId(UUID ownerId);

    @Query("select count(distinct d.species.id) from Detection d where d.ownerId = :ownerId")
    long countDistinctSpeciesByOwnerId(@Param("ownerId") UUID ownerId);

    @Query("select avg(d.confidence) from Detection d where d.ownerId = :ownerId")
    Double averageConfidenceByOwnerId(@Param("ownerId") UUID ownerId);

    @Query("select d.recordedAt from Detection d where d.ownerId = :ownerId")
    List<Instant> findRecordedAtByOwnerId(@Param("ownerId") UUID ownerId);
}
