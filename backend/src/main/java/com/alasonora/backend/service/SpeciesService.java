package com.alasonora.backend.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.alasonora.backend.dto.SpeciesDto;
import com.alasonora.backend.entity.Species;
import com.alasonora.backend.repository.SpeciesRepository;

@Service
public class SpeciesService {

    private final SpeciesRepository speciesRepository;

    public SpeciesService(SpeciesRepository speciesRepository) {
        this.speciesRepository = speciesRepository;
    }

    public List<SpeciesDto> getAll() {
        return speciesRepository.findAll().stream().map(SpeciesDto::fromEntity).toList();
    }

    public SpeciesDto getById(Long id) {
        return SpeciesDto.fromEntity(findEntity(id));
    }

    Species findEntity(Long id) {
        return speciesRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Species not found: " + id));
    }
}
