package com.alasonora.backend.ai;

import java.util.List;

/**
 * Puerto (inversión de dependencias) para el motor que identifica aves en una foto.
 * Cumple el papel de {@link BirdSoundClassifier} para el audio, pero lo separo porque
 * son modalidades distintas, con entradas y fallos independientes.
 */
public interface BirdPhotoClassifier {

    /** @return candidatos ordenados por confianza, el mayor primero. Nunca null; vacío si no se identificó nada. */
    List<RawPhotoClassificationCandidate> classify(byte[] photoBytes);
}
