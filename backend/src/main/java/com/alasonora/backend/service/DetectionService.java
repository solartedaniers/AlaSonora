package com.alasonora.backend.service;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.alasonora.backend.config.SupabaseProperties;
import com.alasonora.backend.dto.CreateDetectionRequest;
import com.alasonora.backend.dto.DetectionDto;
import com.alasonora.backend.entity.Detection;
import com.alasonora.backend.entity.DetectionCandidate;
import com.alasonora.backend.entity.Species;
import com.alasonora.backend.entity.Visibility;
import com.alasonora.backend.repository.DetectionRepository;
import com.alasonora.backend.storage.PrivateObjectSignedUrlResolver;
import com.alasonora.backend.storage.SignedUrlException;

@Service
public class DetectionService {

    private final DetectionRepository detectionRepository;
    private final SpeciesService speciesService;
    private final PrivateObjectSignedUrlResolver signedUrlResolver;
    private final SupabaseProperties.Storage storageProperties;

    public DetectionService(
        DetectionRepository detectionRepository,
        SpeciesService speciesService,
        PrivateObjectSignedUrlResolver signedUrlResolver,
        SupabaseProperties supabaseProperties
    ) {
        this.detectionRepository = detectionRepository;
        this.speciesService = speciesService;
        this.signedUrlResolver = signedUrlResolver;
        this.storageProperties = supabaseProperties.storage();
    }

    // readOnly: keeps the Hibernate session open while mapping to DTOs, since
    // species/alternatives are lazy and open-in-view is disabled.
    @Transactional(readOnly = true)
    public List<DetectionDto> getPublicDetections() {
        return detectionRepository.findByVisibilityOrderByRecordedAtDesc(Visibility.PUBLIC).stream()
            .map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<DetectionDto> getMyDetections(UUID ownerId) {
        return detectionRepository.findByOwnerIdOrderByRecordedAtDesc(ownerId).stream()
            .map(this::toDto).toList();
    }

    // Una detección PRIVATE solo revela sus URLs (audio, foto del observador)
    // a su dueño; para cualquier otro solicitante se comporta como si no
    // existiera, en vez de confirmar con un 403 que el id sí corresponde a
    // un registro real.
    @Transactional(readOnly = true)
    public DetectionDto getByIdForRequester(Long id, UUID requesterId) {
        Detection detection = detectionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Detection not found"));
        if (detection.getVisibility() == Visibility.PRIVATE && !detection.getOwnerId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Detection not found");
        }
        return toDto(detection);
    }

    public DetectionDto createDetection(UUID ownerId, CreateDetectionRequest request) {
        Detection detection = new Detection();
        detection.setOwnerId(ownerId);
        detection.setRecordedAt(request.recordedAt());
        detection.setAudioStoragePath(request.audioStoragePath());
        detection.setDurationSeconds(request.durationSeconds());
        detection.setSpecies(speciesService.findEntity(Long.valueOf(request.speciesId())));
        detection.setConfidence(request.confidence());
        detection.setPeakFrequencyHz(request.peakFrequencyHz());
        detection.setLocation(request.location().toEntity());
        detection.setObserverName(request.observerName());
        detection.setFieldNotes(request.fieldNotes());
        detection.setVisibility(request.visibility());

        if (request.alternatives() != null) {
            request.alternatives().forEach(candidate -> {
                DetectionCandidate entity = new DetectionCandidate();
                entity.setDetection(detection);
                Species species = speciesService.findEntity(Long.valueOf(candidate.speciesId()));
                entity.setSpecies(species);
                entity.setConfidence(candidate.confidence());
                detection.getAlternatives().add(entity);
            });
        }

        return toDto(detectionRepository.save(detection));
    }

    // Solo el dueño puede adjuntar su propia foto de observación a una
    // detección ya existente; sube directo a Storage desde el frontend
    // (mismo patrón que avatars), esto solo persiste el path.
    @Transactional
    public DetectionDto setObserverPhoto(Long id, UUID requesterId, String observerPhotoStoragePath) {
        Detection detection = detectionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Detection not found"));
        if (!detection.getOwnerId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Detection not found");
        }
        detection.setObserverPhotoStoragePath(observerPhotoStoragePath);
        return toDto(detection);
    }

    // Borra el registro sin importar su visibilidad: al desaparecer de
    // detections, deja de aparecer tanto en el mapa público como en el
    // historial privado del dueño, que son la misma tabla.
    public void deleteDetection(Long id) {
        if (!detectionRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Detection not found");
        }
        detectionRepository.deleteById(id);
    }

    private DetectionDto toDto(Detection detection) {
        String signedAudioUrl = detection.getAudioStoragePath() == null
            ? null
            : signedUrlResolver.resolveSignedUrl(
                storageProperties.recordingsBucket(),
                detection.getAudioStoragePath(),
                storageProperties.signedUrlTtlSeconds()
            );
        String signedObserverPhotoUrl = resolveObserverPhotoUrl(detection);
        return DetectionDto.fromEntity(detection, signedAudioUrl, signedObserverPhotoUrl);
    }

    // A diferencia del audio (la función central de la detección, que debe
    // fallar ruidosamente si no se puede servir), una foto de observador que
    // no se pueda firmar se degrada a null: nunca debe tumbar la carga de
    // toda la detección por un problema en un campo secundario.
    private String resolveObserverPhotoUrl(Detection detection) {
        if (detection.getObserverPhotoStoragePath() == null) return null;
        try {
            return signedUrlResolver.resolveSignedUrl(
                storageProperties.observerPhotosBucket(),
                detection.getObserverPhotoStoragePath(),
                storageProperties.signedUrlTtlSeconds()
            );
        } catch (SignedUrlException ex) {
            return null;
        }
    }
}
