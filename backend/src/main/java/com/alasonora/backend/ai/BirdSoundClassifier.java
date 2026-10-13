package com.alasonora.backend.ai;

import java.util.List;

/**
 * Puerto (inversión de dependencias) para el motor bioacústico que identifica especies
 * en una grabación. La capa de servicio depende solo de esta interfaz, nunca de
 * {@link BirdNetHttpClassifier}, así puedo cambiar el motor (otro modelo, un mock) sin tocarla.
 */
public interface BirdSoundClassifier {

    /** @return candidatos ordenados por confianza, el mayor primero. Nunca null; vacío si no se identificó nada. */
    List<RawClassificationCandidate> classify(ClassificationRequest request);
}
