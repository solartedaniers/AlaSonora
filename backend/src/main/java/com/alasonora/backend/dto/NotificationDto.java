package com.alasonora.backend.dto;

import java.time.Instant;

/**
 * Aviso de la campana: otra persona guardó una detección pública. Sin URLs firmadas a propósito:
 * el panel solo muestra texto y enlaza al resultado, que firma lo suyo al abrirse.
 */
public record NotificationDto(
    String detectionId,
    String observerName,
    SpeciesDto species,
    GeoLocationDto location,
    // Nombre del lugar guardado o, si no hay, el lugar conocido más cercano; null si no hay ninguno cerca.
    String area,
    Instant createdAt,
    boolean unread
) {
}
