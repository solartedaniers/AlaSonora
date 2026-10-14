package com.alasonora.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.alasonora.backend.ai.AiEngineHealthClient;
import com.alasonora.backend.dto.AiStatusDto;

/**
 * Calentamiento del motor de IA: el frontend lo consulta al iniciar sesión y en Grabar.
 * Requiere sesión, así nadie anónimo mantiene despierto el motor; nunca expone su URL ni su clave.
 */
@RestController
@RequestMapping("/api/ai")
public class AiStatusController {

    private final AiEngineHealthClient healthClient;

    public AiStatusController(AiEngineHealthClient healthClient) {
        this.healthClient = healthClient;
    }

    @GetMapping("/status")
    public AiStatusDto status() {
        return new AiStatusDto(healthClient.isReady());
    }
}
