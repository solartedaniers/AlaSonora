package com.alasonora.backend.ai;

import java.util.List;

/**
 * Port (dependency inversion) for whatever bioacoustic engine identifies
 * species from a recording. The domain/service layer depends only on this
 * interface, never on {@link BirdNetHttpClassifier} directly, so the engine
 * can be swapped (a different model, a mock for tests) without touching it.
 */
public interface BirdSoundClassifier {

    /** @return candidates ranked by confidence, highest first. Never null; empty when nothing was identified. */
    List<RawClassificationCandidate> classify(ClassificationRequest request);
}
