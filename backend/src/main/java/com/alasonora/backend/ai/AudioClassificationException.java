package com.alasonora.backend.ai;

/**
 * Envuelve cualquier fallo al hablar con el motor bioacústico (red, respuesta
 * inválida, timeout). La dejo como excepción simple: el paquete `ai` no depende
 * de HTTP, así que traducirla a un status es tarea de la capa de servicio.
 */
public class AudioClassificationException extends RuntimeException {

    public AudioClassificationException(String message, Throwable cause) {
        super(message, cause);
    }
}
