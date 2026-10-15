package com.alasonora.backend.service;

import com.alasonora.backend.exception.ApiErrorMessages;

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
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.alasonora.backend.entity.Profile;
import com.alasonora.backend.repository.ProfileRepository;

@Service
public class DetectionService {

    private final DetectionRepository detectionRepository;
    private final SpeciesService speciesService;
    private final PrivateObjectSignedUrlResolver signedUrlResolver;
    private final SupabaseProperties.Storage storageProperties;
    private final ProfileRepository profileRepository;

    public DetectionService(
        DetectionRepository detectionRepository,
        SpeciesService speciesService,
        PrivateObjectSignedUrlResolver signedUrlResolver,
        SupabaseProperties supabaseProperties,
        ProfileRepository profileRepository
    ) {
        this.profileRepository = profileRepository;
        this.detectionRepository = detectionRepository;
        this.speciesService = speciesService;
        this.signedUrlResolver = signedUrlResolver;
        this.storageProperties = supabaseProperties.storage();
    }

    // readOnly: mantiene abierta la sesión de Hibernate al mapear a DTO, porque
    // species/alternatives son lazy y open-in-view está desactivado.
    @Transactional(readOnly = true)
    public List<DetectionDto> getPublicDetections() {
        return toDtos(detectionRepository.findByVisibilityOrderByRecordedAtDesc(Visibility.PUBLIC));
    }

    @Transactional(readOnly = true)
    public List<DetectionDto> getMyDetections(UUID ownerId) {
        return toDtos(detectionRepository.findByOwnerIdOrderByRecordedAtDesc(ownerId));
    }

    /** Mapa con sesión: públicas de todos más las privadas propias (el filtro lo hace la consulta). */
    @Transactional(readOnly = true)
    public List<DetectionDto> getFeedFor(UUID requesterId) {
        return toDtos(detectionRepository.findVisibleTo(Visibility.PUBLIC, requesterId));
    }

    // Una detección PRIVATE solo revela sus URLs (audio, foto del observador)
    // a su dueño; para cualquier otro solicitante se comporta como si no
    // existiera, en vez de confirmar con un 403 que el id sí corresponde a
    // un registro real.
    @Transactional(readOnly = true)
    public DetectionDto getByIdForRequester(Long id, UUID requesterId) {
        Detection detection = detectionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, ApiErrorMessages.DETECTION_NOT_FOUND));
        if (detection.getVisibility() == Visibility.PRIVATE && !detection.getOwnerId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ApiErrorMessages.DETECTION_NOT_FOUND);
        }
        return toDto(detection);
    }

    public DetectionDto createDetection(UUID ownerId, CreateDetectionRequest request) {
        Detection detection = new Detection();
        requireOwnedStoragePath(ownerId, request.audioStoragePath());
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
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, ApiErrorMessages.DETECTION_NOT_FOUND));
        if (!detection.getOwnerId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ApiErrorMessages.DETECTION_NOT_FOUND);
        }
        requireOwnedStoragePath(requesterId, observerPhotoStoragePath);
        detection.setObserverPhotoStoragePath(observerPhotoStoragePath);
        return toDto(detection);
    }

    // Borra el registro sin importar su visibilidad: al desaparecer de
    // detections, deja de aparecer tanto en el mapa público como en el
    // historial privado del dueño, que son la misma tabla.
    public void deleteDetection(Long id) {
        if (!detectionRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ApiErrorMessages.DETECTION_NOT_FOUND);
        }
        detectionRepository.deleteById(id);
    }

    // Los paths llegan del cliente y luego se firman con la service_role key,
    // que ignora las políticas RLS de Storage: sin esta comprobación un
    // usuario podría guardar el path de la carpeta de otro y recibir una URL
    // firmada de su grabación/foto privada.
    static boolean isOwnedStoragePath(UUID ownerId, String storagePath) {
        return storagePath.startsWith(ownerId + "/") && !storagePath.contains("..");
    }

    private static void requireOwnedStoragePath(UUID ownerId, String storagePath) {
        if (storagePath != null && !isOwnedStoragePath(ownerId, storagePath)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ApiErrorMessages.STORAGE_PATH_OUTSIDE_OWN_FOLDER);
        }
    }

    /** Una sola consulta de perfiles por lista: el nombre visible es el usuario actual de cada dueño. */
    private List<DetectionDto> toDtos(List<Detection> detections) {
        Set<UUID> owners = detections.stream().map(detection -> detection.getOwnerId()).collect(Collectors.toSet());
        Map<UUID, String> usernames = usernamesOf(owners);
        return detections.stream().map(detection -> toDto(detection, usernames)).toList();
    }

    private DetectionDto toDto(Detection detection) {
        return toDto(detection, usernamesOf(Set.of(detection.getOwnerId())));
    }

    private Map<UUID, String> usernamesOf(Set<UUID> ownerIds) {
        Map<UUID, String> usernames = new HashMap<>();
        for (Profile profile : profileRepository.findAllById(ownerIds)) {
            if (profile.getUsername() != null && !profile.getUsername().isBlank()) usernames.put(profile.getId(), profile.getUsername());
        }
        return usernames;
    }

    private DetectionDto toDto(Detection detection, Map<UUID, String> usernames) {
        String signedAudioUrl = detection.getAudioStoragePath() == null
            ? null
            : signedUrlResolver.resolveSignedUrl(
                storageProperties.recordingsBucket(),
                detection.getAudioStoragePath(),
                storageProperties.signedUrlTtlSeconds()
            );
        String signedObserverPhotoUrl = resolveObserverPhotoUrl(detection);
        // Sin usuario (cuenta aún sin migrar) uso el nombre que se guardó con la detección.
        String observerName = usernames.getOrDefault(detection.getOwnerId(), detection.getObserverName());
        return DetectionDto.fromEntity(detection, signedAudioUrl, signedObserverPhotoUrl, observerName);
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
