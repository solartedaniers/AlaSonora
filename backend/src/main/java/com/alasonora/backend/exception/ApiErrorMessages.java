package com.alasonora.backend.exception;

/** Mensajes de error de la API en un solo lugar (sin textos sueltos en servicios y controladores). */
public final class ApiErrorMessages {

    public static final String USER_NOT_FOUND = "User not found";
    public static final String DETECTION_NOT_FOUND = "Detection not found";
    public static final String SPECIES_NOT_FOUND = "Species not found: ";
    public static final String ONLY_PUBLIC_VISIBILITY = "Only visibility=public is supported here";
    public static final String STORAGE_PATH_OUTSIDE_OWN_FOLDER = "Storage path must be inside the requester's own folder";
    public static final String BIOACOUSTIC_ENGINE_UNAVAILABLE = "The bioacoustic engine is unavailable";
    public static final String PHOTO_ENGINE_UNAVAILABLE = "The photo-classification engine is unavailable";
    public static final String PHOTO_UNREADABLE = "Could not read the uploaded photo";
    // El frontend aún reconoce estos textos como respaldo si el backend no envía errorCode.
    public static final String NO_SPECIES_IN_RECORDING = "No bird species were identified in this recording";
    public static final String NO_SPECIES_IN_PHOTO = "No bird species were identified in this photo";

    private ApiErrorMessages() {
    }
}
