package com.alasonora.backend.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.alasonora.backend.entity.Detection;
import com.alasonora.backend.entity.Visibility;

public interface DetectionRepository extends JpaRepository<Detection, Long> {

    List<Detection> findByVisibility(Visibility visibility);

    List<Detection> findByOwnerId(UUID ownerId);
}
