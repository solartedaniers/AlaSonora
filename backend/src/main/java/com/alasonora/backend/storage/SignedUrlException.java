package com.alasonora.backend.storage;

/** Wraps any failure while asking Supabase Storage to sign an object's URL. */
public class SignedUrlException extends RuntimeException {

    public SignedUrlException(String message, Throwable cause) {
        super(message, cause);
    }
}
