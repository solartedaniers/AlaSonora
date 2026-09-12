package com.alasonora.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.alasonora.backend.entity.Species;

public interface SpeciesRepository extends JpaRepository<Species, Long> {
}
