package com.alasonora.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.alasonora.backend.dto.SpeciesDto;
import com.alasonora.backend.service.SpeciesService;

@RestController
@RequestMapping("/api/species")
public class SpeciesController {

    private final SpeciesService speciesService;

    public SpeciesController(SpeciesService speciesService) {
        this.speciesService = speciesService;
    }

    @GetMapping
    public List<SpeciesDto> getAll() {
        return speciesService.getAll();
    }

    @GetMapping("/{id}")
    public SpeciesDto getById(@PathVariable Long id) {
        return speciesService.getById(id);
    }
}
