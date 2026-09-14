package com.alasonora.backend.dto;

import com.alasonora.backend.entity.SystemRole;
import jakarta.validation.constraints.NotNull;

public record UpdateSystemRoleRequest(@NotNull SystemRole systemRole) {
}
