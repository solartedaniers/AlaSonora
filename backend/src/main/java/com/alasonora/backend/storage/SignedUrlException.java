package com.alasonora.backend.storage;

/** Envuelve cualquier fallo al pedir a Supabase Storage que firme la URL de un objeto. */
public class SignedUrlException extends RuntimeException {

    public SignedUrlException(String message, Throwable cause) {
        super(message, cause);
    }
}
