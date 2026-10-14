package com.alasonora.backend.dto;

/** Estado del motor de IA para el frontend: listo para clasificar o todavía no. */
public record AiStatusDto(boolean ready) {
}
