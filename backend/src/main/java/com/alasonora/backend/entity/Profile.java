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

/**
 * id is auth.users.id from Supabase Auth, assigned (not generated) when the
 * profile is first created for a signed-up user. The FK constraint to
 * auth.users must be added manually via SQL, since Hibernate's ddl-auto only
 * manages tables in the application's own schema, not Supabase Auth's.
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
}
