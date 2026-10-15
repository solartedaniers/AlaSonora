package com.alasonora.backend.repository;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.alasonora.backend.entity.Profile;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCaseAndIdNot(String username, UUID id);

    // Solo esta columna: un UPDATE corto que no pisa otros cambios del perfil hechos al mismo tiempo.
    @Modifying
    @Query("update Profile p set p.notificationsSeenAt = :seenAt where p.id = :id")
    int markNotificationsSeen(@Param("id") UUID id, @Param("seenAt") Instant seenAt);
}
