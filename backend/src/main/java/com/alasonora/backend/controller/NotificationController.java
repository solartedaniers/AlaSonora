package com.alasonora.backend.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.alasonora.backend.dto.NotificationFeedDto;
import com.alasonora.backend.service.NotificationService;

/** Campana de avisos del usuario con sesión: el historial y marcarlo como leído. */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public NotificationFeedDto mine(@AuthenticationPrincipal Jwt jwt) {
        return notificationService.feedFor(UUID.fromString(jwt.getSubject()));
    }

    @PostMapping("/read")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal Jwt jwt) {
        notificationService.markAllRead(UUID.fromString(jwt.getSubject()));
        return ResponseEntity.noContent().build();
    }
}
