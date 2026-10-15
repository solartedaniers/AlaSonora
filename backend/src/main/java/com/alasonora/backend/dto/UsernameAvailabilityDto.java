package com.alasonora.backend.dto;

/** Respuesta de la comprobación previa al registro: si el formato es válido y si nadie lo usa. */
public record UsernameAvailabilityDto(boolean valid, boolean available) {
}
