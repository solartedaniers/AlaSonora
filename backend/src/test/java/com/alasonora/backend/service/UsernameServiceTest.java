package com.alasonora.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.alasonora.backend.config.UsernameProperties;
import com.alasonora.backend.exception.CodedResponseStatusException;
import com.alasonora.backend.repository.ProfileRepository;

/** Formato, unicidad y generación desde el correo (mismo criterio que la migración SQL). */
class UsernameServiceTest {

    private final ProfileRepository repository = mock(ProfileRepository.class);
    private final UsernameService service = new UsernameService(repository, new UsernameProperties(3, 20));

    @Test
    void validatesFormatAndLength() {
        assertTrue(service.isValid("omairalimas05"));
        assertFalse(service.isValid("ab"));
        assertFalse(service.isValid("con espacio"));
        assertFalse(service.isValid("símbolo!"));
        assertFalse(service.isValid("a".repeat(21)));
    }

    @Test
    void rejectsTakenUsernameIgnoringCase() {
        when(repository.existsByUsernameIgnoreCaseAndIdNot("Omaira", UUID.fromString("00000000-0000-0000-0000-000000000001"))).thenReturn(true);
        CodedResponseStatusException ex = assertThrows(CodedResponseStatusException.class,
            () -> service.requireUsable("Omaira", UUID.fromString("00000000-0000-0000-0000-000000000001")));
        assertEquals("USERNAME_TAKEN", ex.getErrorCode().name());
    }

    @Test
    void generatesFromEmailWithoutSymbolsAndDeduplicates() {
        Set<String> taken = Set.of("omairalimas05");
        when(repository.existsByUsernameIgnoreCase(anyString())).thenAnswer(call -> taken.contains(call.<String>getArgument(0)));
        assertEquals("omairalimas052", service.generateFrom("omairalimas05@gmail.com"));
        assertEquals("juanperez", service.generateFrom("juan.perez@uni.edu"));
        assertEquals("abobservador", service.generateFrom("a.b@x.co"));
    }
}
