package com.alasonora.backend.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.concurrent.CompletionException;

import org.junit.jupiter.api.Test;
import org.springframework.boot.web.error.ErrorAttributeOptions;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.server.ResponseStatusException;

class ApiErrorAttributesTest {

    private final ApiErrorAttributes errorAttributes = new ApiErrorAttributes();

    private Map<String, Object> attributesFor(Exception error) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        errorAttributes.resolveException(request, new MockHttpServletResponse(), null, error);
        return errorAttributes.getErrorAttributes(new ServletWebRequest(request), ErrorAttributeOptions.defaults());
    }

    @Test
    void addsTheErrorCodeEvenWhenWrappedByTheAsyncClassification() {
        CodedResponseStatusException coded = new CodedResponseStatusException(
            HttpStatus.UNPROCESSABLE_CONTENT, ApiErrorMessages.NO_SPECIES_IN_RECORDING, ApiErrorCode.NO_SPECIES_IDENTIFIED);

        assertThat(attributesFor(new CompletionException(coded)))
            .containsEntry(ApiErrorAttributes.ERROR_CODE_ATTRIBUTE, "NO_SPECIES_IDENTIFIED");
    }

    @Test
    void leavesOtherErrorsWithoutACode() {
        assertThat(attributesFor(new ResponseStatusException(HttpStatus.NOT_FOUND, ApiErrorMessages.DETECTION_NOT_FOUND)))
            .doesNotContainKey(ApiErrorAttributes.ERROR_CODE_ATTRIBUTE);
    }
}
