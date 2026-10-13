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
 * Identifica un ave a partir de una foto, aparte de {@code /api/detections} (audio):
 * no crea Detection ni usa Storage; la foto pasa al motor de IA y se descarta.
 */
@RestController
@RequestMapping("/api/photo-classifications")
public class PhotoClassificationController {

    private final PhotoClassificationService classificationService;

    public PhotoClassificationController(PhotoClassificationService classificationService) {
        this.classificationService = classificationService;
    }

    // CompletableFuture por la misma razón que POST /api/detections/classify:
    // libera el hilo de Tomcat mientras responde el motor de IA.
    @PostMapping
    public CompletableFuture<ResponseEntity<PhotoClassificationResultDto>> classify(@RequestParam MultipartFile photo) {
        return classificationService.classify(photo).thenApply(ResponseEntity::ok);
    }
}
