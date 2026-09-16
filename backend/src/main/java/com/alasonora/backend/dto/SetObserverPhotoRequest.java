package com.alasonora.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record SetObserverPhotoRequest(@NotBlank String observerPhotoStoragePath) {
}
