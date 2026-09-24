// ── Keyword presets ──────────────────────────────────────────────────────────
//
// MACBOOK_*: los que usa esta extensión (reventa de MacBooks).
// PRESET_*: pack original de bienes raíces — se conserva por referencia; la
// extensión de real estate vive en extension/.

export const MACBOOK_POSITIVES = [
  'macbook',
  'mac book',
  'macbook air',
  'macbook pro',
  'macbook neo',
  'm1',
  'm2',
  'm3',
  'm4',
  'm5',
  'apple laptop',
  'laptop apple',
]

export const MACBOOK_NEGATIVES = [
  'busco',
  'compro',
  'se compra',
  'funda',
  'cargador',
  'reparación',
  'reparacion',
  'reparamos',
  'servicio técnico',
  'servicio tecnico',
  'refacciones',
  'para piezas',
  'mica',
  'teclado para',
  'cambio de pantalla',
  'cambio de batería',
  'cambio de bateria',
]

// ── Bienes raíces (referencia) ──
//
// Listas curadas para arrancar rápido. El usuario puede agregar/quitar
// individualmente después.

export const PRESET_POSITIVES = [
  // Intención de compra/renta
  'busco departamento',
  'busco depa',
  'busco casa',
  'busco loft',
  'busco habitación',
  'busco habitacion',
  'busco rentar',
  'busco renta',
  'busco residencia',
  'necesito rentar',
  'me interesa rentar',
  'compro casa',
  'compro depa',
  'compro departamento',
  'interesado en comprar',
  'interesada en comprar',
  // Presupuesto / financiamiento (señal de seriedad)
  'presupuesto',
  'mi presupuesto',
  'hipoteca',
  'crédito',
  'credito',
  'infonavit',
  'fovissste',
  'enganche',
  // Urgencia
  'urge',
  'urgente',
  'necesito mudar',
  'necesito mudarme',
]

export const PRESET_NEGATIVES = [
  // Oferta competidora (otro agente/dueño rentando o vendiendo)
  'se renta',
  'se vende',
  'rento mi',
  'rento este',
  'vendo mi',
  'vendo casa',
  'en renta',
  'en venta',
  'disponible para renta',
  'disponible para venta',
  'para rentar a',
  'para venta',
  // Auto-promoción de otros agentes
  'soy agente',
  'soy broker',
  'asesor inmobiliario',
  'asesora inmobiliaria',
  'agente inmobiliari',
  'vende tu casa',
  'vende tu depa',
  'te ayudo a vender',
  'comisión',
  'comision',
  // Scams / off-topic
  'multinivel',
  'crypto',
  'criptomon',
  'amway',
  'oportunidad de negocio',
  'gana dinero desde casa',
  'trabaja desde casa',
]
