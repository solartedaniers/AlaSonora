package com.alasonora.backend.entity;

public enum IucnStatus {
    LC, NT, VU, EN, CR,
    // Real IUCN categories, kept for completeness even though none of them
    // are used as an auto-registration default (NE is, see below).
    DD, EW, EX,
    // Real IUCN category for species with no formal conservation assessment
    // yet — used as the honest default for species auto-registered from an
    // AI classification, instead of guessing a real status.
    NE
}
