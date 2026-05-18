export interface ZoneConfig {
  name: string
  searchUrl: string
  locationKeywords: string[]  // filtra listings cuya location no coincida
  desarrolloKeywords: string[]
}

export const ZONES: ZoneConfig[] = [
  {
    name: "Interlomas",
    searchUrl:
      "https://www.inmuebles24.com/departamentos-en-venta-en-interlomas.html",
    // Solo se guardan listings cuya location contenga alguna de estas palabras
    locationKeywords: ["Interlomas", "Huixquilucan"],
    desarrolloKeywords: [
      "Hacienda del Ciervo",
      "Bosques de Interlomas",
      "Arborea",
      "Arbórea",
      "Punto Verde",
      "Manigua",
      "Fontana",
      "Monte Magno",
      "Las Haciendas",
      "Vitalia",
      "Serena",
    ],
  },
]

export const MAX_PAGES = 15
export const PAGE_DELAY_MS = 2500
export const SUSPEND_AFTER_HOURS = 30

export const SELECTORS = {
  // Cada tarjeta — el elemento que tiene data-id y data-to-posting
  listingCard: ".postingCardLayout-module__posting-card-layout",

  // Precio — h2 que puede contener "Departamentos desde\nMN X"
  price: '[data-qa="POSTING_CARD_PRICE"]',

  // Título/descripción — enlace dentro del h2
  titleLink: '[data-qa="POSTING_CARD_DESCRIPTION"] a',

  // Features: "3 rec.", "120 m²", "161 m² lote", "2 baños"
  featureSpans: '[data-qa="POSTING_CARD_FEATURES"] span',

  // Ubicación: "Interlomas, Huixquilucan"
  location: '[data-qa="POSTING_CARD_LOCATION"]',

  // Dirección: "Av. Jesús del Monte 32A"
  address: ".postingLocations-module__location-address",

  // Amenidades: "Gimnasio", "Alberca", etc.
  amenities: ".postingCard-module__pill-item-feature",

  // Primera imagen de la galería
  image: ".postingGallery-module__gallery-container img",

  // Paginación — href vacío, se navega por click JS
  nextPage: '[data-qa="PAGING_NEXT"]',

  // Contenedor de resultados (para detectar si cargó la página)
  resultsContainer: ".postingsList-module__postings-container",
}
