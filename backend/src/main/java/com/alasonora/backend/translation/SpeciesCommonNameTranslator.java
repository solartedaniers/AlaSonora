package com.alasonora.backend.translation;

import java.util.Optional;

/**
 * Puerto para resolver el nombre común en español de una especie a partir de
 * su nombre científico. Ninguna implementación debe apoyarse en un catálogo
 * local fijo de especies: el contrato exige resolución dinámica para poder
 * cubrir cualquier ave del mundo sin desplegar cambios de código.
 */
public interface SpeciesCommonNameTranslator {

    Optional<String> translateToSpanish(String scientificName);
}
