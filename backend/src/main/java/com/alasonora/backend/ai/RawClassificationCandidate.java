package com.alasonora.backend.ai;

/** One species candidate returned by the bioacoustic engine, confidence already normalized to the app-wide 0-100 scale. */
public record RawClassificationCandidate(String scientificName, String commonName, double confidence) {
}
