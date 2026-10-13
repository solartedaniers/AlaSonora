package com.alasonora.backend.exception;

import java.util.Map;

import org.springframework.boot.webmvc.error.DefaultErrorAttributes;
import org.springframework.boot.web.error.ErrorAttributeOptions;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.WebRequest;

/**
 * Mismo cuerpo de error de Spring de siempre (status, message…) más
 * `errorCode` cuando la causa lo tiene. Solo se agrega un campo: los clientes
 * que leen `message` siguen funcionando igual.
 */
@Component
public class ApiErrorAttributes extends DefaultErrorAttributes {

    static final String ERROR_CODE_ATTRIBUTE = "errorCode";

    @Override
    public Map<String, Object> getErrorAttributes(WebRequest webRequest, ErrorAttributeOptions options) {
        Map<String, Object> attributes = super.getErrorAttributes(webRequest, options);
        // Recorro las causas: la clasificación es asíncrona y llega envuelta en CompletionException.
        for (Throwable error = getError(webRequest); error != null; error = error.getCause()) {
            if (error instanceof CodedResponseStatusException coded) {
                attributes.put(ERROR_CODE_ATTRIBUTE, coded.getErrorCode().name());
                break;
            }
        }
        return attributes;
    }
}
