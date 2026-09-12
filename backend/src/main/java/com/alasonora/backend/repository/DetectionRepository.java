package com.alasonora.backend.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.alasonora.backend.entity.Detection;
import com.alasonora.backend.entity.Visibility;

public interface DetectionRepository extends JpaRepository<Detection, Long> {

    List<Detection> findByVisibility(Visibility visibility);

    List<Detection> findByOwnerId(UUID ownerId);

    long countByVisibility(Visibility visibility);

    @Query("select count(distinct d.ownerId) from Detection d where d.visibility = :visibility")
    long countDistinctOwnersByVisibility(@Param("visibility") Visibility visibility);

    @Query("select avg(d.confidence) from Detection d where d.visibility = :visibility")
    Double averageConfidenceByVisibility(@Param("visibility") Visibility visibility);
}
