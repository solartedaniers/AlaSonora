package com.alasonora.backend.ai;

/**
 * Señala que el motor de IA no pudo identificar un ave en la foto (por
 * debajo del umbral de confianza), no una falla de infraestructura. Se
 * distingue de {@link PhotoClassificationException} para que el llamador
 * pueda devolver el mensaje exacto del motor en vez de un error genérico.
 */
public class NoBirdInPhotoException extends RuntimeException {

    public NoBirdInPhotoException(String message) {
        super(message);
    }
}
