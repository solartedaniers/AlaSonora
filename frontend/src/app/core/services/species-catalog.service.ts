import { Injectable } from '@angular/core';
import { Species } from '../models';

/**
 * Catálogo de especies. Implementación mock mientras no existe backend.
 * La interfaz pública (getAll/getById) es la misma que tendrá el servicio
 * real basado en HttpClient contra la API FastAPI — solo cambia la
 * implementación interna, los componentes que lo consumen no se modifican.
 */
@Injectable({ providedIn: 'root' })
export class SpeciesCatalogService {
  private readonly species: Species[] = [
    {
      id: 'turdus-chiguanco',
      commonName: 'Zorzal Chiguanco',
      commonNameEn: 'Chiguanco Thrush',
      scientificName: 'Turdus chiguanco',
      family: 'Turdidae',
      order: 'Passeriformes',
      iucnStatus: 'LC',
      imageUrl: 'assets/species/turdus-chiguanco.jpg',
    },
    {
      id: 'ensifera-ensifera',
      commonName: 'Colibrí Picoespada',
      commonNameEn: 'Sword-billed Hummingbird',
      scientificName: 'Ensifera ensifera',
      family: 'Trochilidae',
      order: 'Apodiformes',
      iucnStatus: 'LC',
      imageUrl: 'assets/species/ensifera-ensifera.jpg',
    },
    {
      id: 'scelorchilus-rubecula',
      commonName: 'Chucao Tapaculo',
      commonNameEn: 'Chucao Tapaculo',
      scientificName: 'Scelorchilus rubecula',
      family: 'Rhinocryptidae',
      order: 'Passeriformes',
      iucnStatus: 'LC',
      imageUrl: 'assets/species/scelorchilus-rubecula.jpg',
    },
    {
      id: 'cyanocorax-yncas',
      commonName: 'Chara Verde',
      commonNameEn: 'Green Jay',
      scientificName: 'Cyanocorax yncas',
      family: 'Corvidae',
      order: 'Passeriformes',
      iucnStatus: 'LC',
      imageUrl: 'assets/species/cyanocorax-yncas.jpg',
    },
    {
      id: 'pharomachrus-mocinno',
      commonName: 'Quetzal Resplandeciente',
      commonNameEn: 'Resplendent Quetzal',
      scientificName: 'Pharomachrus mocinno',
      family: 'Trogonidae',
      order: 'Trogoniformes',
      iucnStatus: 'NT',
      imageUrl: 'assets/species/pharomachrus-mocinno.jpg',
    },
    {
      id: 'harpia-harpyja',
      commonName: 'Águila Harpía',
      commonNameEn: 'Harpy Eagle',
      scientificName: 'Harpia harpyja',
      family: 'Accipitridae',
      order: 'Accipitriformes',
      iucnStatus: 'VU',
      imageUrl: 'assets/species/harpia-harpyja.jpg',
    },
    {
      id: 'rupicola-peruvianus',
      commonName: 'Gallito de las Rocas',
      commonNameEn: "Andean Cock-of-the-rock",
      scientificName: 'Rupicola peruvianus',
      family: 'Cotingidae',
      order: 'Passeriformes',
      iucnStatus: 'LC',
      imageUrl: 'assets/species/rupicola-peruvianus.jpg',
    },
    {
      id: 'thraupis-episcopus',
      commonName: 'Tangara Azuleja',
      commonNameEn: 'Blue-gray Tanager',
      scientificName: 'Thraupis episcopus',
      family: 'Thraupidae',
      order: 'Passeriformes',
      iucnStatus: 'LC',
      imageUrl: 'assets/species/thraupis-episcopus.jpg',
    },
  ];

  async getAll(): Promise<Species[]> {
    return this.species;
  }

  async getById(id: string): Promise<Species | undefined> {
    return this.species.find((s) => s.id === id);
  }

  async search(query: string): Promise<Species[]> {
    const q = query.trim().toLowerCase();
    if (!q) return this.species;
    return this.species.filter(
      (s) =>
        s.commonName.toLowerCase().includes(q) ||
        s.scientificName.toLowerCase().includes(q) ||
        s.family.toLowerCase().includes(q)
    );
  }
}
