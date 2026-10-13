package com.alasonora.backend.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

/**
 * id es auth.users.id de Supabase Auth, asignado (no generado) al crear el perfil del
 * usuario registrado. La FK a auth.users se agrega a mano por SQL, porque ddl-auto de
 * Hibernate solo maneja el esquema de la aplicación, no el de Supabase Auth.
 */
@Entity
@Table(name = "profiles")
@Getter
@Setter
public class Profile {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String displayName;

    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ObserverRole role;

    private String institution;

    private String orcidId;

    private String stationName;

    // ColumnDefault evita que ddl-auto=update falle al agregar esta columna
    // NOT NULL sobre una tabla con filas existentes.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @ColumnDefault("'USER'")
    private SystemRole systemRole = SystemRole.USER;

    // Cache local del baneo en Supabase Auth (la fuente real de verdad,
    // enforced vía ban_duration): solo sirve para pintar el estado en el
    // panel de administración, no para autorizar nada en este backend.
    @Column(nullable = false)
    @ColumnDefault("false")
    private boolean suspended;
}
