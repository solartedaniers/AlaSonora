package com.alasonora.backend.controller;

import java.util.concurrent.CompletableFuture;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.alasonora.backend.dto.PhotoClassificationResultDto;
import com.alasonora.backend.service.PhotoClassificationService;

/**
 * Identifies a bird species from a photo — fully separate feature from
 * {@code /api/detections} (audio pipeline): no Detection is created, no
 * Storage bucket involved, the photo is only forwarded to the AI engine and
 * discarded.
 */
@RestController
@RequestMapping("/api/photo-classifications")
public class PhotoClassificationController {

    private final PhotoClassificationService classificationService;

    public PhotoClassificationController(PhotoClassificationService classificationService) {
        this.classificationService = classificationService;
    }

    // Returns a CompletableFuture for the same reason as POST /api/detections/classify:
    // frees the Tomcat request thread while the AI engine call is in flight.
    @PostMapping
    public CompletableFuture<ResponseEntity<PhotoClassificationResultDto>> classify(@RequestParam MultipartFile photo) {
        return classificationService.classify(photo).thenApply(ResponseEntity::ok);
    }
}
