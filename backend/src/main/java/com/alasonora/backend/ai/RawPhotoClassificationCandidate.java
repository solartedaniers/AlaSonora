package com.alasonora.backend.ai;

/** One species label returned by the photo-classification engine, confidence already normalized to the app-wide 0-100 scale. */
public record RawPhotoClassificationCandidate(String label, double confidence) {
}
