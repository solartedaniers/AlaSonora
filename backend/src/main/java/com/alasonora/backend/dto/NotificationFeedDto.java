package com.alasonora.backend.dto;

import java.util.List;

/** Lo que pinta la campana: cuántos avisos sin leer hay y el historial reciente. */
public record NotificationFeedDto(long unreadCount, List<NotificationDto> items) {
}
