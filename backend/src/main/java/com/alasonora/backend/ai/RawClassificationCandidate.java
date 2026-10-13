package com.alasonora.backend.ai;

/** Un candidato de especie del motor bioacústico, con la confianza ya normalizada a la escala 0-100 de la app. */
public record RawClassificationCandidate(String scientificName, String commonName, double confidence) {
}
