package com.alasonora.backend.translation;

import java.util.Optional;

/**
 * Puerto para resolver una imagen de referencia de una especie a partir de su
 * nombre científico. Ninguna implementación debe depender de un catálogo
 * local: debe resolverse dinámicamente para cubrir cualquier especie sin
 * mantener una lista propia de imágenes.
 */
public interface SpeciesImageResolver {

    Optional<String> resolveImageUrl(String scientificName);
}
