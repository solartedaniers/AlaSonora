package com.alasonora.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.alasonora.backend.entity.Species;

public interface SpeciesRepository extends JpaRepository<Species, Long> {

    Optional<Species> findByScientificNameIgnoreCase(String scientificName);
}
