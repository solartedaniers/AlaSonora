package com.alasonora.backend.entity;

public enum IucnStatus {
    LC, NT, VU, EN, CR,
    // Categorías reales de la UICN, completas aunque ninguna sea el valor por defecto
    // del registro automático (ese es NE, abajo).
    DD, EW, EX,
    // Categoría UICN para especies aún sin evaluación formal: es el valor honesto para
    // las especies registradas desde una clasificación de IA, en vez de adivinar un estado.
    NE
}
