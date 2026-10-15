package com.alasonora.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.alasonora.backend.dto.UsernameAvailabilityDto;
import com.alasonora.backend.service.UsernameService;

/**
 * Comprobación previa al registro: sin sesión todavía, por eso es pública (ver PublicEndpoints).
 * Solo responde si el formato es válido y si está libre; no revela nada de la cuenta que lo use.
 */
@RestController
@RequestMapping("/api/usernames")
public class UsernameController {

    private final UsernameService usernameService;

    public UsernameController(UsernameService usernameService) {
        this.usernameService = usernameService;
    }

    @GetMapping("/availability")
    public UsernameAvailabilityDto availability(@RequestParam String username) {
        String candidate = username.strip();
        boolean valid = usernameService.isValid(candidate);
        return new UsernameAvailabilityDto(valid, valid && usernameService.isAvailable(candidate, null));
    }
}
