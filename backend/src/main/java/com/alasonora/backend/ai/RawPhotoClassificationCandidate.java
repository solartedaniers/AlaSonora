package com.alasonora.backend.ai;

/** Una especie devuelta por el motor de fotos, con la confianza ya normalizada a la escala 0-100 de la app. */
public record RawPhotoClassificationCandidate(String label, double confidence) {
}
