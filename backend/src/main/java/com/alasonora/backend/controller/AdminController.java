package com.alasonora.backend.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.alasonora.backend.admin.AdminUserService;
import com.alasonora.backend.dto.CreateUserRequest;
import com.alasonora.backend.dto.DetectionDto;
import com.alasonora.backend.dto.ProfileDto;
import com.alasonora.backend.dto.UpdateProfileRequest;
import com.alasonora.backend.dto.UpdateSystemRoleRequest;
import com.alasonora.backend.service.DetectionService;
import com.alasonora.backend.service.ProfileService;

import jakarta.validation.Valid;

/** Endpoints exclusivos del panel de administración; protegidos por hasRole("ADMIN") en SecurityConfig. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminUserService adminUserService;
    private final ProfileService profileService;
    private final DetectionService detectionService;

    public AdminController(AdminUserService adminUserService, ProfileService profileService, DetectionService detectionService) {
        this.adminUserService = adminUserService;
        this.profileService = profileService;
        this.detectionService = detectionService;
    }

    @GetMapping("/users")
    public List<ProfileDto> listUsers() {
        return adminUserService.listUsers();
    }

    @PostMapping("/users")
    public ResponseEntity<ProfileDto> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminUserService.createUser(request));
    }

    @PutMapping("/users/{id}")
    public ProfileDto updateUser(@PathVariable UUID id, @Valid @RequestBody UpdateProfileRequest request) {
        return profileService.update(id, request);
    }

    @PutMapping("/users/{id}/role")
    public ProfileDto updateRole(@PathVariable UUID id, @Valid @RequestBody UpdateSystemRoleRequest request) {
        return adminUserService.setSystemRole(id, request.systemRole());
    }

    @PutMapping("/users/{id}/suspend")
    public ProfileDto suspendUser(@PathVariable UUID id) {
        return adminUserService.setSuspended(id, true);
    }

    @PutMapping("/users/{id}/activate")
    public ProfileDto activateUser(@PathVariable UUID id) {
        return adminUserService.setSuspended(id, false);
    }

    @GetMapping("/users/{id}/detections")
    public List<DetectionDto> getUserDetections(@PathVariable UUID id) {
        return detectionService.getMyDetections(id);
    }

    @DeleteMapping("/detections/{id}")
    public ResponseEntity<Void> deleteDetection(@PathVariable Long id) {
        detectionService.deleteDetection(id);
        return ResponseEntity.noContent().build();
    }
}
