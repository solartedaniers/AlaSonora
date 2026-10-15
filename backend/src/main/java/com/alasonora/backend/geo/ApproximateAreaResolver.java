package com.alasonora.backend.geo;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import com.alasonora.backend.config.NotificationProperties;

/**
 * Zona aproximada de unas coordenadas sin servicios externos: el lugar conocido más cercano de una
 * lista local (cabeceras y ciudades de Colombia). Más lejos del radio configurado no nombro ninguno.
 */
@Component
public class ApproximateAreaResolver {

    private static final String PLACES_RESOURCE = "geo/colombia-places.csv";
    private static final double EARTH_RADIUS_KM = 6371.0;

    private record Place(String name, String region, double latitude, double longitude) {
        String label() {
            return name.equals(region) ? name : name + ", " + region;
        }
    }

    private final List<Place> places;
    private final double maxDistanceKm;

    public ApproximateAreaResolver(NotificationProperties properties) {
        this.places = loadPlaces();
        this.maxDistanceKm = properties.areaMaxDistanceKm();
    }

    /** "Pasto, Nariño" si hay un lugar conocido dentro del radio; vacío si no. */
    public Optional<String> nearestArea(double latitude, double longitude) {
        Place nearest = null;
        double nearestKm = Double.MAX_VALUE;
        for (Place place : places) {
            double km = distanceKm(latitude, longitude, place.latitude(), place.longitude());
            if (km < nearestKm) {
                nearest = place;
                nearestKm = km;
            }
        }
        return nearest != null && nearestKm <= maxDistanceKm ? Optional.of(nearest.label()) : Optional.empty();
    }

    /** Distancia sobre la esfera (haversine): suficiente para elegir el lugar más cercano. */
    static double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
    }

    private static List<Place> loadPlaces() {
        try {
            String csv = new ClassPathResource(PLACES_RESOURCE).getContentAsString(StandardCharsets.UTF_8);
            // La primera línea es el encabezado.
            return csv.lines().skip(1).filter(line -> !line.isBlank()).map(line -> {
                String[] cells = line.split(";");
                return new Place(cells[0], cells[1], Double.parseDouble(cells[2]), Double.parseDouble(cells[3]));
            }).toList();
        } catch (IOException ex) {
            throw new UncheckedIOException("Could not read " + PLACES_RESOURCE, ex);
        }
    }
}
