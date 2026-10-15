package com.alasonora.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Reglas del nombre de usuario (profile.username.*): solo letras y números, con largo mínimo y máximo. */
@ConfigurationProperties(prefix = "profile.username")
public record UsernameProperties(int minLength, int maxLength) {
}
