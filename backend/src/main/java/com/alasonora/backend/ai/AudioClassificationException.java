package com.alasonora.backend.ai;

/**
 * Wraps any failure talking to the bioacoustic engine (network error, bad
 * response, timeout). Kept as a plain runtime exception here — the `ai`
 * package has no HTTP/web dependency, so translating it into an HTTP status
 * is the caller's (service layer's) job.
 */
public class AudioClassificationException extends RuntimeException {

    public AudioClassificationException(String message, Throwable cause) {
        super(message, cause);
    }
}
