package com.alasonora.backend.service;

import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.alasonora.backend.config.UsernameProperties;
import com.alasonora.backend.exception.ApiErrorCode;
import com.alasonora.backend.exception.ApiErrorMessages;
import com.alasonora.backend.exception.CodedResponseStatusException;
import com.alasonora.backend.repository.ProfileRepository;

/**
 * Nombre de usuario: formato (solo letras y números, largo configurable) y unicidad sin distinguir
 * mayúsculas. También genera uno libre a partir de una semilla (p. ej. el correo) para cuentas sin él.
 */
@Service
public class UsernameService {

    private static final Pattern ALPHANUMERIC = Pattern.compile("^[A-Za-z0-9]+$");
    private static final Pattern NOT_ALPHANUMERIC = Pattern.compile("[^a-z0-9]");
    private static final String FALLBACK_SEED = "observador";

    private final ProfileRepository profileRepository;
    private final UsernameProperties rules;

    public UsernameService(ProfileRepository profileRepository, UsernameProperties rules) {
        this.profileRepository = profileRepository;
        this.rules = rules;
    }

    public boolean isValid(String username) {
        return username != null
            && username.length() >= rules.minLength()
            && username.length() <= rules.maxLength()
            && ALPHANUMERIC.matcher(username).matches();
    }

    /** Libre para quien lo pide: un usuario puede volver a guardar su propio nombre. */
    public boolean isAvailable(String username, UUID requesterId) {
        return requesterId == null
            ? !profileRepository.existsByUsernameIgnoreCase(username)
            : !profileRepository.existsByUsernameIgnoreCaseAndIdNot(username, requesterId);
    }

    /** Valida y comprueba unicidad; lanza errores con código estable para que el frontend los traduzca. */
    public String requireUsable(String username, UUID requesterId) {
        String candidate = username == null ? null : username.strip();
        if (!isValid(candidate)) {
            throw new CodedResponseStatusException(HttpStatus.BAD_REQUEST, ApiErrorMessages.USERNAME_INVALID, ApiErrorCode.USERNAME_INVALID);
        }
        if (!isAvailable(candidate, requesterId)) {
            throw new CodedResponseStatusException(HttpStatus.CONFLICT, ApiErrorMessages.USERNAME_TAKEN, ApiErrorCode.USERNAME_TAKEN);
        }
        return candidate;
    }

    /**
     * Nombre libre a partir de una semilla: parte del correo antes de @, sin símbolos, recortado al
     * máximo y con un número al final si ya existe. Mismo criterio que la migración SQL.
     */
    public String generateFrom(String seed) {
        String local = seed == null ? "" : seed.split("@", 2)[0].toLowerCase(Locale.ROOT);
        String base = NOT_ALPHANUMERIC.matcher(local).replaceAll("");
        // Correos muy cortos o solo con símbolos: completo con una palabra fija hasta el mínimo.
        if (base.length() < rules.minLength()) base = base + FALLBACK_SEED;
        base = base.substring(0, Math.min(base.length(), rules.maxLength()));
        String candidate = base;
        for (int suffix = 2; !isAvailable(candidate, null); suffix++) {
            String number = String.valueOf(suffix);
            candidate = base.substring(0, Math.min(base.length(), rules.maxLength() - number.length())) + number;
        }
        return candidate;
    }
}
