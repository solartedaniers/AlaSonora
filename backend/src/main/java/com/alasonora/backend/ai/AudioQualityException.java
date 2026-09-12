package com.alasonora.backend.ai;

/**
 * Señala que el motor de IA rechazó el audio por su calidad (ruido excesivo o
 * ausencia de canto de ave detectable), no por una falla de infraestructura.
 * Se distingue de {@link AudioClassificationException} para que el llamador
 * pueda devolver el mensaje exacto del motor en vez de un error genérico.
 */
public class AudioQualityException extends RuntimeException {

    public AudioQualityException(String message) {
        super(message);
    }
}
