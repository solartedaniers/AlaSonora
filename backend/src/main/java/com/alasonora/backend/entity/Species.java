package com.alasonora.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "species")
@Getter
@Setter
public class Species {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String commonName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String commonNameEn;

    @Column(nullable = false, unique = true, columnDefinition = "TEXT")
    private String scientificName;

    @Column(columnDefinition = "TEXT")
    private String family;

    // "order" is a reserved word in Postgres, so the column is renamed.
    @Column(name = "taxon_order", columnDefinition = "TEXT")
    private String order;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IucnStatus iucnStatus;

    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    // Bioacoustic enrichment: populated for curated species, defaults to
    // UNKNOWN for species that were auto-registered from an AI classification
    // (BirdNET itself never reports vocalization type, only the species).
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VocalizationType vocalizationType = VocalizationType.UNKNOWN;

    @Column(columnDefinition = "TEXT")
    private String behaviorNotes;
}
