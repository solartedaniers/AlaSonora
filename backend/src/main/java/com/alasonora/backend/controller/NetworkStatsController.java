package com.alasonora.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.alasonora.backend.dto.NetworkStatsDto;
import com.alasonora.backend.service.NetworkStatsService;

@RestController
@RequestMapping("/api/network-stats")
public class NetworkStatsController {

    private final NetworkStatsService networkStatsService;

    public NetworkStatsController(NetworkStatsService networkStatsService) {
        this.networkStatsService = networkStatsService;
    }

    @GetMapping
    public NetworkStatsDto get() {
        return networkStatsService.getStats();
    }
}
