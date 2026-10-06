package com.alasonora.backend.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.UUID;

import org.junit.jupiter.api.Test;

class DetectionServiceTest {

    private static final UUID OWNER = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OTHER = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Test
    void isOwnedStoragePath() {
        assertTrue(DetectionService.isOwnedStoragePath(OWNER, OWNER + "/1759000000000.wav"));
        assertFalse(DetectionService.isOwnedStoragePath(OWNER, OTHER + "/1759000000000.wav"));
        // prefijo de otro UUID que empieza igual, sin la barra de carpeta
        assertFalse(DetectionService.isOwnedStoragePath(OWNER, OWNER + "x/a.wav"));
        assertFalse(DetectionService.isOwnedStoragePath(OWNER, OWNER + "/../" + OTHER + "/a.wav"));
        assertFalse(DetectionService.isOwnedStoragePath(OWNER, "https://example.com/" + OWNER + "/a.wav"));
    }
}
