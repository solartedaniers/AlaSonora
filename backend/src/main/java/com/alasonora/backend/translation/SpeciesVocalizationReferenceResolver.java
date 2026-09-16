package com.alasonora.backend.translation;

import java.util.List;

/**
 * Puerto para resolver, a partir del nombre científico, los tipos de
 * vocalización documentados para una especie en fuentes externas (canto,
 * reclamo, dueto, etc.). Es metadata de referencia de la especie, nunca un
 * análisis de una grabación puntual.
 */
public interface SpeciesVocalizationReferenceResolver {

    List<String> resolveTypicalVocalizations(String scientificName);
}
