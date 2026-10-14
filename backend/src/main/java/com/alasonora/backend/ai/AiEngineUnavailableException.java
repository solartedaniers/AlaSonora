package com.alasonora.backend.ai;

/**
 * El motor no respondió (apagado, despertando o caído), a diferencia de un fallo al bajar
 * la grabación: el cliente puede esperar a que despierte y reintentar.
 */
public class AiEngineUnavailableException extends AudioClassificationException {

    public AiEngineUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
