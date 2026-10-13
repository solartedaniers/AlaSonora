package com.alasonora.backend.ai;

/**
 * Envuelve cualquier fallo al hablar con el motor de fotos (red, respuesta inválida,
 * timeout). Igual que {@link AudioClassificationException}, pero aparte porque los
 * motores de audio y foto son independientes y fallan por separado.
 */
public class PhotoClassificationException extends RuntimeException {

    public PhotoClassificationException(String message, Throwable cause) {
        super(message, cause);
    }
}
