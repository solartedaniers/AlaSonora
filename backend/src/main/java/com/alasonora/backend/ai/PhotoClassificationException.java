package com.alasonora.backend.ai;

/**
 * Wraps any failure talking to the photo-classification engine (network
 * error, bad response, timeout). Mirrors {@link AudioClassificationException}
 * but kept separate since these two engines (audio vs. photo) are unrelated
 * and can fail independently.
 */
public class PhotoClassificationException extends RuntimeException {

    public PhotoClassificationException(String message, Throwable cause) {
        super(message, cause);
    }
}
