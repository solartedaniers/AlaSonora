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

    @Column(nullable = false)
    private String commonName;

    @Column(nullable = false)
    private String commonNameEn;

    @Column(nullable = false, unique = true)
    private String scientificName;

    private String family;

    // "order" is a reserved word in Postgres, so the column is renamed.
    @Column(name = "taxon_order")
    private String order;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IucnStatus iucnStatus;

    private String imageUrl;

    // Bioacoustic enrichment: populated for curated species, defaults to
    // UNKNOWN for species that were auto-registered from an AI classification
    // (BirdNET itself never reports vocalization type, only the species).
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VocalizationType vocalizationType = VocalizationType.UNKNOWN;

    @Column(columnDefinition = "text")
    private String behaviorNotes;
}
