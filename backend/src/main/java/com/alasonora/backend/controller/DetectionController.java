package com.alasonora.backend.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.alasonora.backend.dto.CreateDetectionRequest;
import com.alasonora.backend.dto.DetectionDto;
import com.alasonora.backend.service.DetectionService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/detections")
public class DetectionController {

    private static final String PUBLIC_VISIBILITY_PARAM = "public";

    private final DetectionService detectionService;

    public DetectionController(DetectionService detectionService) {
        this.detectionService = detectionService;
    }

    @GetMapping
    public List<DetectionDto> getPublicDetections(@RequestParam String visibility) {
        if (!PUBLIC_VISIBILITY_PARAM.equalsIgnoreCase(visibility)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only visibility=public is supported here");
        }
        return detectionService.getPublicDetections();
    }

    @GetMapping("/mine")
    public List<DetectionDto> getMine(@AuthenticationPrincipal Jwt jwt) {
        return detectionService.getMyDetections(UUID.fromString(jwt.getSubject()));
    }

    @PostMapping
    public ResponseEntity<DetectionDto> create(
        @AuthenticationPrincipal Jwt jwt,
        @Valid @RequestBody CreateDetectionRequest request
    ) {
        DetectionDto created = detectionService.createDetection(UUID.fromString(jwt.getSubject()), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
