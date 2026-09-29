package com.alasonora.backend.ai;

import java.util.List;

/**
 * Port (dependency inversion) for whatever engine identifies bird species
 * from a photo. Mirrors {@link BirdSoundClassifier}'s role for audio, but
 * kept as a separate interface since the two are unrelated modalities with
 * independent inputs/failure modes.
 */
public interface BirdPhotoClassifier {

    /** @return candidates ranked by confidence, highest first. Never null; empty when nothing was identified. */
    List<RawPhotoClassificationCandidate> classify(byte[] photoBytes);
}
