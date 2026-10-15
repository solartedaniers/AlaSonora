package com.alasonora.backend.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.alasonora.backend.entity.Profile;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCaseAndIdNot(String username, UUID id);
}
