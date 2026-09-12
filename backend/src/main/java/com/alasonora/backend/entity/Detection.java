package com.alasonora.backend.entity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "detections")
@Getter
@Setter
public class Detection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // References auth.users.id in Supabase; not a JPA relation since that
    // table is owned and managed by Supabase Auth, not by this application.
    @Column(nullable = false)
    private UUID ownerId;

    @Column(nullable = false)
    private Instant recordedAt;

    private String audioUrl;

    @Column(nullable = false)
    private double durationSeconds;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "species_id", nullable = false)
    private Species species;

    @Column(nullable = false)
    private double confidence;

    @Column(nullable = false)
    private double peakFrequencyHz;

    @OneToMany(mappedBy = "detection", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DetectionCandidate> alternatives = new ArrayList<>();

    @Embedded
    private GeoLocation location;

    private String observerName;

    private String fieldNotes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Visibility visibility = Visibility.PRIVATE;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}
