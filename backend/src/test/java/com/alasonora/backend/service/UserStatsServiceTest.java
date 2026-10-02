package com.alasonora.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.Set;

import org.junit.jupiter.api.Test;

class UserStatsServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 2);

    @Test
    void currentStreakDays() {
        assertEquals(0, UserStatsService.currentStreakDays(Set.of(), TODAY));
        assertEquals(1, UserStatsService.currentStreakDays(Set.of(TODAY), TODAY));
        assertEquals(3, UserStatsService.currentStreakDays(
            Set.of(TODAY, TODAY.minusDays(1), TODAY.minusDays(2), TODAY.minusDays(4)), TODAY));
        // sin grabación hoy, la racha que llega hasta ayer sigue contando
        assertEquals(2, UserStatsService.currentStreakDays(Set.of(TODAY.minusDays(1), TODAY.minusDays(2)), TODAY));
        // un día completo sin grabar la rompe
        assertEquals(0, UserStatsService.currentStreakDays(Set.of(TODAY.minusDays(2), TODAY.minusDays(3)), TODAY));
    }
}
