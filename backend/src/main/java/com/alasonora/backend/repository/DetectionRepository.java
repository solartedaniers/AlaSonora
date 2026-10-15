package com.alasonora.backend.repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.alasonora.backend.entity.Detection;
import com.alasonora.backend.entity.Visibility;

public interface DetectionRepository extends JpaRepository<Detection, Long> {

    List<Detection> findByVisibilityOrderByRecordedAtDesc(Visibility visibility);

    List<Detection> findByOwnerIdOrderByRecordedAtDesc(UUID ownerId);

    // Mapa con sesión: todas las públicas más las privadas del propio usuario, nunca las privadas de otros.
    @Query("select d from Detection d where d.visibility = :visibility or d.ownerId = :ownerId order by d.recordedAt desc")
    List<Detection> findVisibleTo(@Param("visibility") Visibility visibility, @Param("ownerId") UUID ownerId);

    // Avisos de la campana: lo que otros publicaron, lo más reciente primero (nunca lo propio).
    @Query("select d from Detection d where d.visibility = :visibility and d.ownerId <> :requesterId order by d.createdAt desc")
    List<Detection> findLatestFromOthers(@Param("visibility") Visibility visibility, @Param("requesterId") UUID requesterId, Pageable page);

    long countByVisibilityAndOwnerIdNotAndCreatedAtAfter(Visibility visibility, UUID ownerId, Instant createdAfter);

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
