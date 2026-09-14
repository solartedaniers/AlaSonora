package com.alasonora.backend.config;

import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import com.alasonora.backend.entity.SystemRole;
import com.alasonora.backend.repository.ProfileRepository;

/**
 * El rol de administración vive en profiles.system_role (no en el JWT de
 * Supabase, que solo trae claims de auth.users), así que cada request
 * autenticado hace una lectura liviana por PK para resolver ROLE_ADMIN/ROLE_USER
 * y poder usar hasRole("ADMIN") de forma declarativa en SecurityConfig.
 */
@Component
public class ProfileRoleJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private static final Logger log = LoggerFactory.getLogger(ProfileRoleJwtAuthenticationConverter.class);

    private final ProfileRepository profileRepository;

    public ProfileRoleJwtAuthenticationConverter(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        SystemRole systemRole = resolveSystemRole(jwt.getSubject());
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + systemRole.name()));
        return new JwtAuthenticationToken(jwt, authorities);
    }

    // Un valor de system_role editado a mano en la base (p. ej. "admin" en
    // minúscula en vez de "ADMIN") hace que Hibernate lance una excepción al
    // hidratar la fila, no que findById devuelva Optional.empty(): sin este
    // try/catch, ese typo tumbaba con 500 CUALQUIER request autenticado del
    // usuario (no solo los de /api/admin/**), en vez de solo negarle el rol.
    private SystemRole resolveSystemRole(String userId) {
        try {
            return profileRepository.findById(UUID.fromString(userId))
                .map(profile -> profile.getSystemRole())
                .orElse(SystemRole.USER);
        } catch (RuntimeException e) {
            log.warn("No se pudo resolver system_role para el usuario {}; se usa USER por defecto. "
                + "Verifica que profiles.system_role tenga exactamente el valor 'USER' o 'ADMIN'.", userId, e);
            return SystemRole.USER;
        }
    }
}
