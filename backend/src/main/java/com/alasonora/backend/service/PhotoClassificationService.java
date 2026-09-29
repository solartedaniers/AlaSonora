package com.alasonora.backend.service;

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
 * Orchestrates one photo classification, mirroring {@link DetectionClassificationService}'s
 * shape (bulkhead executor, port call, ranked result) but deliberately not
 * touching the species catalog or the Detection entity — this feature only
 * shows the AI's result, it does not persist a detection record.
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read the uploaded photo", ex);
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
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The photo-classification engine is unavailable", ex);
        }

        if (raw.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "No bird species were identified in this photo");
        }

        List<PhotoClassificationCandidateDto> ranked = raw.stream()
            .map(c -> new PhotoClassificationCandidateDto(c.label(), c.confidence()))
            .toList();

        return new PhotoClassificationResultDto(ranked.get(0), ranked.subList(1, ranked.size()));
    }
}
