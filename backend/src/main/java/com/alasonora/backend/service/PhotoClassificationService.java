package com.alasonora.backend.service;

import com.alasonora.backend.exception.ApiErrorMessages;
import com.alasonora.backend.exception.ApiErrorCode;
import com.alasonora.backend.exception.CodedResponseStatusException;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.alasonora.backend.ai.BirdPhotoClassifier;
import com.alasonora.backend.ai.NoBirdInPhotoException;
import com.alasonora.backend.ai.PhotoClassificationException;
import com.alasonora.backend.ai.RawPhotoClassificationCandidate;
import com.alasonora.backend.dto.PhotoClassificationCandidateDto;
import com.alasonora.backend.dto.PhotoClassificationResultDto;

/**
 * Orquesta una clasificación de foto con la forma de {@link DetectionClassificationService}
 * (bulkhead, llamada al puerto, resultado ordenado), pero sin tocar el catálogo ni
 * Detection: solo muestra el resultado de la IA, no guarda ninguna detección.
 */
@Service
public class PhotoClassificationService {

    private final BirdPhotoClassifier classifier;
    private final Executor aiTaskExecutor;

    public PhotoClassificationService(BirdPhotoClassifier classifier, @Qualifier("aiTaskExecutor") Executor aiTaskExecutor) {
        this.classifier = classifier;
        this.aiTaskExecutor = aiTaskExecutor;
    }

    public CompletableFuture<PhotoClassificationResultDto> classify(MultipartFile photo) {
        byte[] photoBytes;
        try {
            photoBytes = photo.getBytes();
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ApiErrorMessages.PHOTO_UNREADABLE, ex);
        }
        return CompletableFuture.supplyAsync(() -> runClassification(photoBytes), aiTaskExecutor);
    }

    private PhotoClassificationResultDto runClassification(byte[] photoBytes) {
        List<RawPhotoClassificationCandidate> raw;
        try {
            raw = classifier.classify(photoBytes);
        } catch (NoBirdInPhotoException ex) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, ex.getMessage(), ex);
        } catch (PhotoClassificationException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, ApiErrorMessages.PHOTO_ENGINE_UNAVAILABLE, ex);
        }

        if (raw.isEmpty()) {
            throw new CodedResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, ApiErrorMessages.NO_SPECIES_IN_PHOTO, ApiErrorCode.NO_SPECIES_IDENTIFIED);
        }

        List<PhotoClassificationCandidateDto> ranked = raw.stream()
            .map(c -> new PhotoClassificationCandidateDto(c.label(), c.confidence()))
            .toList();

        return new PhotoClassificationResultDto(ranked.get(0), ranked.subList(1, ranked.size()));
    }
}
