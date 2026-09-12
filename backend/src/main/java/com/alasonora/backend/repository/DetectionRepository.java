package com.alasonora.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.alasonora.backend.entity.Detection;

public interface DetectionRepository extends JpaRepository<Detection, Long> {
}
