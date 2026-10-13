package com.alasonora.backend.exception;

import org.springframework.http.HttpStatusCode;
import org.springframework.web.server.ResponseStatusException;

/** ResponseStatusException que además lleva un código estable para el cliente (ver ApiErrorAttributes). */
public class CodedResponseStatusException extends ResponseStatusException {

    private final ApiErrorCode errorCode;

    public CodedResponseStatusException(HttpStatusCode status, String reason, ApiErrorCode errorCode) {
        super(status, reason);
        this.errorCode = errorCode;
    }

    public ApiErrorCode getErrorCode() {
        return errorCode;
    }
}
