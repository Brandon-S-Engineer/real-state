// ── Calendario de festivales de GW2 + ítems ligados ──────────────────────────
//
// Los 6 festivales anuales recurrentes. La tesis de trading (del brief): durante
// el festival la OFERTA de sus materiales se dispara — todo el mundo farmea y
// abre cofres a la vez — así que el precio toca fondo cerca del final del
// evento. La otra cara: algunos materiales base SUBEN al inicio porque se usan
// como "moneda" para comprar cajas/recompensas del festival (caso Four Winds).
// Esta sección lista los ítems ligados a cada evento, agrupados por rol, para
// OBSERVAR su comportamiento real en el historial largo (años).
//
// Los IDs están verificados contra el cache local de ítems tradeables (Gw2Item,
// universo del TP). Los materiales relevantes de cada festival se investigaron
// en la wiki oficial y en guías de oro (no adivinados). Items account-bound del
// festival (Continue Coins, Bauble Bubbles, sobres sin abrir) no aparecen: no se
// comercian.

export type EventItem = {
  id: number
  /** Qué es y por qué su precio se mueve con el festival. */
  note?: string
}

/** Un grupo temático de ítems dentro de un evento (subsección). */
export type EventItemGroup = {
  label: string
  /** Explica el rol de este grupo en el festival (la lógica de trading). */
  note?: string
  items: EventItem[]
}

export type Gw2Event = {
  slug: string
  name: string
  emoji: string
  location: string
  /** Ventana anual aproximada (mes 1-12 / día). endMonth < startMonth ⇒ cruza el año (Wintersday). */
  window: { startMonth: number; startDay: number; endMonth: number; endDay: number }
  /** true si las fechas de este año ya están confirmadas por ArenaNet. */
  confirmed: boolean
  /** Frase corta de qué es el evento. */
  blurb: string
  /** La lógica de trading concreta del festival. */
  strategy: string
  groups: EventItemGroup[]
}

// Materiales que se pagan como "moneda" por las Zephyrite Supply Boxes. Se
// listan SOLO los de alto valor unitario: un +30% sobre un Copper Ore de 11c es
// ruido que no mueve la aguja, por más lindo que se vea el porcentaje. Lo que
// importa es el oro absoluto por unidad × las unidades que podés acumular.
const FOUR_WINDS_CURRENCY: EventItem[] = [
  { id: 19721, note: 'Glob of Ectoplasm — el rey del festival: 7 por caja, alto valor unitario y demanda cruzada de crafteo. Acumular por meses y descargar durante el evento.' },
  { id: 24277, note: 'Pile of Crystalline Dust — ecto procesado (×1.85). Sube junto con el ecto y es el otro gran vehículo de acumulación.' },
  { id: 44941, note: 'Watchwork Sprocket — mat especial aceptado como pago; de los que más se infla con la demanda del bazar.' },
  { id: 19701, note: 'Orichalcum Ore — alto valor unitario y demanda cruzada con crafteo ascendido.' },
  { id: 19745, note: 'Gossamer Scrap — la tela de tier más alto; la única del grupo con valor unitario que justifica acumular.' },
  { id: 19748, note: 'Silk Scrap — volumen enorme y precio decente; el caballo de batalla de las telas.' },
  { id: 19725, note: 'Ancient Wood Log — la madera de tier alto.' },
  { id: 19732, note: 'Hardened Leather Section — el cuero de tier alto; históricamente el más escaso de los cueros.' },
  { id: 19700, note: 'Mithril Ore — volumen altísimo; sirve más por cantidad que por precio unitario.' },
  { id: 19722, note: 'Elder Wood Log — mismo caso que el Mithril: se acumula por volumen.' },
]

// Lo que los GANADORES liquidan: las infusiones que salen de las cajas con
// probabilidad de lotería. Casi nadie las saca, pero el que la saca la lista de
// inmediato para realizar — y eso basta para hundir un mercado tan chico.
// Verificado con datos: caen 20-27% durante el festival y se recuperan después.
const FOUR_WINDS_INFUSIONS: EventItem[] = [
  { id: 88732, note: 'Crystal Infusion of Condition Damage — la más consistente del grupo: se hunde fuerte durante el festival y se recuperó TODOS los años medidos.' },
  { id: 90977, note: 'Mystic Infusion — la de mayor retorno medido; mercado chico, así que entrá con órdenes y paciencia.' },
  { id: 88771, note: 'Crystal Infusion of Power — stat popular, buena liquidez relativa dentro de lo ilíquido que son las infusiones.' },
  { id: 88871, note: 'Crystal Infusion of Precision — mismo patrón, algo más irregular año a año.' },
  { id: 91111, note: 'Mystic Infusion (variante) — segunda opción si la otra no tiene órdenes cerca de tu precio.' },
]

export const GW2_EVENTS: Gw2Event[] = [
  {
    slug: 'lunar-new-year',
    name: 'Lunar New Year',
    emoji: '🧧',
    location: "Divinity's Reach",
    window: { startMonth: 2, startDay: 3, endMonth: 2, endDay: 24 },
    confirmed: false,
    blurb: 'Año Nuevo lunar de Tyria — sobres de la suerte, fuegos artificiales y Dragon Ball.',
    strategy:
      'El flip central es el Divine Lucky Envelope: se compra a ~1g del vendor (tope diario por cuenta) y se revende a ~10g en el TP. Además, la gente abre millones de sobres durante el festival y su contenido — fuegos artificiales, comida, mats — inunda el mercado y toca fondo. Las skins de fuegos artificiales y los faroles del zodiaco del año se acuñan solo aquí.',
    groups: [
      {
        label: 'Sobres de la suerte (el flip central)',
        note: 'Comprar barato del vendor y revender en el TP; se abren en masa durante el festival.',
        items: [
          { id: 68646, note: 'Divine Lucky Envelope — ~1g del vendor, ~10g en TP. El motor del festival.' },
          { id: 68642, note: 'Homemade Lucky Envelope — versión crafteada; sigue el mismo ciclo.' },
        ],
      },
      {
        label: 'Contenido que inunda el TP',
        note: 'Sale de los sobres abiertos; su oferta se dispara y el precio cae durante el festival.',
        items: [
          { id: 68634, note: 'Delicious Rice Ball — comida de festival.' },
          { id: 68625, note: 'Lunar New Year Firework — consumible del festival.' },
          { id: 68628, note: 'Great Guild Firework — consumible; oferta estacional.' },
        ],
      },
      {
        label: 'Skins acuñadas solo aquí',
        note: 'Se acuñan durante el festival y escasean el resto del año.',
        items: [
          { id: 99339, note: 'Firework Greatsword — skin de festival.' },
          { id: 99311, note: 'Firework Sword — skin de festival.' },
          { id: 99345, note: 'Firework Axe — skin de festival.' },
          { id: 99324, note: 'Firework Staff — skin de festival.' },
          { id: 101429, note: 'Lucky Great Dragon Lantern — mochila exótica del zodiaco (año del dragón).' },
        ],
      },
    ],
  },
  {
    slug: 'super-adventure-box',
    name: 'Super Adventure Box',
    emoji: '🎮',
    location: 'Rata Sum',
    window: { startMonth: 4, startDay: 14, endMonth: 5, endDay: 5 },
    confirmed: false,
    blurb: 'El mundo retro de Moto — plataformas 8-bit, baubles y skins de armas Super.',
    strategy:
      'Las skins Super se acuñan solo durante SAB: la oferta se dispara mientras el evento está activo (todos venden las que sacan) y el precio se recupera durante el año hasta el siguiente. La jugada es comprar barato al cierre del festival y vender meses después. (Baubles y Bauble Bubbles son account-bound, no se comercian.)',
    groups: [
      {
        label: 'Skins de armas Super (se acuñan solo en SAB)',
        note: 'Mismo ciclo estacional para todas: oferta máxima durante el evento, recuperación el resto del año.',
        items: [
          { id: 41946, note: 'Super Greatsword Skin — de las más demandadas del set.' },
          { id: 41964, note: 'Super Sword Skin.' },
          { id: 41961, note: 'Super Staff Skin.' },
          { id: 41955, note: 'Super Shield Skin.' },
          { id: 46540, note: 'Super Axe Skin.' },
          { id: 46546, note: 'Super Dagger Skin.' },
          { id: 46542, note: 'Super Focus Skin.' },
          { id: 46547, note: 'Super Hammer Skin.' },
          { id: 41949, note: 'Super Long Bow Skin.' },
          { id: 41958, note: 'Super Short Bow Skin.' },
        ],
      },
    ],
  },
  {
    slug: 'dragon-bash',
    name: 'Dragon Bash',
    emoji: '🐉',
    location: 'Hoelbrak',
    window: { startMonth: 6, startDay: 2, endMonth: 6, endDay: 23 },
    confirmed: false,
    blurb: 'Celebración contra los Dragones Ancianos — piñatas, holo-skins y Zhaitaffy.',
    strategy:
      'Zhaitaffy y Jorbreaker son la moneda del festival: su precio cae a medida que avanza el evento (más gente farmea). Los Dragon Coffer y las holo-skins/comida se abren y acuñan en masa. La ventana de compra es el final del festival, cuando la oferta está saturada.',
    groups: [
      {
        label: 'Moneda y contenedores del festival',
        note: 'Su precio cae según avanza el evento por sobreoferta de farmeo.',
        items: [
          { id: 43319, note: 'Piece of Zhaitaffy — moneda del festival; baja según avanza el evento.' },
          { id: 43320, note: 'Jorbreaker — 8-14g en TP; baja durante el festival por sobreoferta.' },
          { id: 43357, note: 'Dragon Coffer — cofre tradeable que se abre en masa durante el evento.' },
        ],
      },
      {
        label: 'Holo-skins y comida (se acuñan/abren en masa)',
        note: 'Escasean fuera del festival; comprar barato al cierre y vender después.',
        items: [
          { id: 43346, note: 'Holographic Dragon Wing Cover — cuesta 100 Jorbreaker; escasea fuera del festival.' },
          { id: 48743, note: 'Mini Holographic Scarlet — minipet exótico del festival.' },
          { id: 87367, note: 'Holographic Super Cake — comida de festival (bonus de festividad).' },
          { id: 87358, note: 'Holographic Super Cheese — comida de festival.' },
          { id: 87329, note: 'Holographic Super Drumstick — comida de festival.' },
          { id: 87336, note: 'Holographic Super Apple — comida de festival.' },
        ],
      },
    ],
  },
  {
    slug: 'festival-of-the-four-winds',
    name: 'Festival of the Four Winds',
    emoji: '🌪️',
    location: 'Labyrinthine Cliffs + Crown Pavilion',
    window: { startMonth: 8, startDay: 11, endMonth: 9, endDay: 1 },
    confirmed: true,
    blurb: 'El bazar Zephyrite y la Arena de Liadri — el festival de verano, y el próximo en llegar.',
    strategy:
      'El ángulo de Four Winds es distinto: los materiales base de Tyria (tela, madera, metal, cuero, ectos, polvo cristalino, watchwork sprockets) se usan como "moneda" para comprar Zephyrite Supply Boxes en los vendors del Bazaar Docks. Como todos hacen lo mismo al inicio del festival, la DEMANDA de esos mats sube de golpe y sus precios en el TP se inflan los primeros días, luego se corrigen. Los ectos y el orichalcum son los más volátiles por su alto valor unitario.',
    groups: [
      {
        label: 'Moneda del bazar — acumular antes, vender DURANTE',
        note: 'Se pagan a los vendors del Bazaar Docks para conseguir las cajas. Como todos compran cajas a la vez, la demanda explota y el precio sube. Solo los de valor unitario alto: sobre un mat de 11c, un +30% no es negocio.',
        items: FOUR_WINDS_CURRENCY,
      },
      {
        label: 'Infusiones — comprar lo que dumpean los ganadores',
        note: 'Salen de las cajas con probabilidad de lotería. El que la saca la lista al instante para realizar la ganancia, y en un mercado de 10-20 unidades listadas eso basta para hundir el precio. Se compran durante el evento y se aguantan meses.',
        items: FOUR_WINDS_INFUSIONS,
      },
      {
        label: 'Ítems propios del festival',
        note: 'Skins/contenedores acuñados solo aquí; oferta estacional.',
        items: [
          { id: 88118, note: 'Superior Rune of the Zephyrite — runa acuñada en el festival.' },
          { id: 82562, note: 'Zephyrite Box of Dreams — contenedor del festival.' },
          { id: 19663, note: 'Bottle of Elonian Wine — ingrediente de Mystic Forge; demanda sube con el crafteo de festival.' },
        ],
      },
    ],
  },
  {
    slug: 'halloween-shadow-of-the-mad-king',
    name: 'Halloween — Shadow of the Mad King',
    emoji: '🎃',
    location: "Lion's Arch",
    window: { startMonth: 10, startDay: 7, endMonth: 11, endDay: 4 },
    confirmed: false,
    blurb: 'El Rey Loco Thorn regresa — el festival con los flips de materiales más limpios del año.',
    strategy:
      'El caso de libro: durante Halloween la gente abre millones de Trick-or-Treat Bags y el mercado se inunda de Candy Corn, Nougat Center, Plastic Fangs y Chattering Skull — su precio se desploma. Comprar en el último tramo del festival y vender en primavera/verano, cuando la oferta se secó, es el flip estacional más consistente.',
    groups: [
      {
        label: 'Materiales (se desploman durante el festival)',
        note: 'Salen de los Trick-or-Treat Bags abiertos en masa; tocan fondo durante el evento y se recuperan después.',
        items: [
          { id: 36041, note: 'Piece of Candy Corn — mat base; determina el precio de casi todo lo demás.' },
          { id: 47909, note: 'Candy Corn Cob — refinado de Candy Corn.' },
          { id: 36061, note: 'Nougat Center — mat de los bags.' },
          { id: 36059, note: 'Plastic Fangs — mat de festival; clásico de compra barata al cierre.' },
          { id: 36060, note: 'Chattering Skull — mat de festival.' },
        ],
      },
      {
        label: 'Contenedor central y runa',
        items: [
          { id: 36038, note: 'Trick-or-Treat Bag — el contenedor central; su apertura masiva marca la oferta de todos los mats.' },
          { id: 36044, note: 'Superior Rune of the Mad King — runa acuñada del festival.' },
        ],
      },
      {
        label: 'Skins y minis del festival',
        note: 'Se acuñan solo en Halloween; escasean el resto del año.',
        items: [
          { id: 44818, note: 'Bloody Prince Staff Skin — skin de festival.' },
          { id: 36339, note: 'Ghastly Grinning Shield Skin — skin clásica del festival.' },
          { id: 88998, note: 'Mini Pumpkin Jack — minipet exótico del festival.' },
        ],
      },
    ],
  },
  {
    slug: 'wintersday',
    name: 'Wintersday',
    emoji: '❄️',
    location: "Divinity's Reach",
    window: { startMonth: 12, startDay: 9, endMonth: 1, endDay: 6 },
    confirmed: false,
    blurb: 'La Navidad de Tyria — regalos, copos de nieve y la Toymaker Tixx.',
    strategy:
      'Espejo de Halloween en invierno: conviene vender los Wintersday Gift en vez de abrirlos, pero al abrirse en masa sueltan Snowflakes, Candy Cane y Snow Diamond, que se desploman durante el festival. Comprar el material barato al cierre y vender a lo largo del año es el flip estacional de diciembre. El drop gordo es la Snow Diamond Infusion (250-500g).',
    groups: [
      {
        label: 'Contenedor central',
        note: 'En promedio rinde más venderlos que abrirlos; su apertura masiva inunda el TP de mats.',
        items: [
          { id: 77604, note: 'Wintersday Gift — el contenedor central del festival.' },
          { id: 99956, note: 'Enchanted Music Box — contenedor tradeable del festival.' },
        ],
      },
      {
        label: 'Copos y materiales (se desploman durante el festival)',
        note: 'Salen de los gifts abiertos; tocan fondo durante el evento.',
        items: [
          { id: 86601, note: 'Snowflake — mat base.' },
          { id: 38131, note: 'Delicate Snowflake — refinado.' },
          { id: 38132, note: 'Glittering Snowflake — refinado.' },
          { id: 38143, note: 'Exquisite Snowflake — el escalón alto de la cadena de copos.' },
          { id: 77651, note: 'Candy Cane — mat de festival; clásico de compra barata al cierre.' },
        ],
      },
      {
        label: 'Gama alta (drops raros del gift)',
        note: 'Baja probabilidad pero alto valor; la infusion es el premio gordo del festival.',
        items: [
          { id: 86627, note: 'Snow Diamond — drop de los gifts; ~6g en TP.' },
          { id: 86704, note: 'Snow Diamond Infusion — drop raro; 250-500g en TP.' },
          { id: 92586, note: 'Rimed Verdant Wintersday Gift — recompensa/drop de abrir 1000 gifts.' },
        ],
      },
    ],
  },
]

// ── Cálculo de estado del calendario ─────────────────────────────────────────

export type EventStatus = {
  status: 'activo' | 'proximo' | 'terminado'
  /** Inicio de la próxima ocurrencia (> ahora). */
  nextStart: Date
  /** Fin de la ocurrencia más reciente ya pasada, o de la activa. */
  lastOrCurrentEnd: Date
  /** Días hasta el próximo inicio (0 si está activo). */
  daysUntilNext: number
  /** Ventana a mostrar: la activa/próxima si aplica, o la más reciente ya pasada. */
  windowStart: Date
  windowEnd: Date
}

function occurrence(ev: Gw2Event, startYear: number): { start: Date; end: Date } {
  const { window: w } = ev
  const start = new Date(startYear, w.startMonth - 1, w.startDay)
  const crossesYear = w.endMonth < w.startMonth
  const end = new Date(crossesYear ? startYear + 1 : startYear, w.endMonth - 1, w.endDay, 23, 59, 59)
  return { start, end }
}

const DAY_MS = 24 * 60 * 60 * 1000

export function getEventStatus(ev: Gw2Event, now: Date = new Date()): EventStatus {
  const y = now.getFullYear()
  const occ = [y - 1, y, y + 1].map((yr) => occurrence(ev, yr))

  const active = occ.find((o) => now >= o.start && now <= o.end)
  const future = occ.filter((o) => o.start > now).sort((a, b) => a.start.getTime() - b.start.getTime())
  const past = occ.filter((o) => o.end < now).sort((a, b) => b.end.getTime() - a.end.getTime())

  const nextStart = active ? active.start : future[0].start
  const lastOrCurrentEnd = active ? active.end : past[0]?.end ?? occ[0].end
  const daysUntilNext = active ? 0 : Math.ceil((future[0].start.getTime() - now.getTime()) / DAY_MS)

  const status: EventStatus['status'] = active
    ? 'activo'
    : future[0].start.getFullYear() === y
      ? 'proximo'
      : 'terminado'

  const shown = active ?? (status === 'proximo' ? future[0] : past[0] ?? occ[0])

  return { status, nextStart, lastOrCurrentEnd, daysUntilNext, windowStart: shown.start, windowEnd: shown.end }
}

export function getEventBySlug(slug: string): Gw2Event | undefined {
  return GW2_EVENTS.find((e) => e.slug === slug)
}

/** Todos los IDs de ítems ligados a algún evento (para batch de precios). */
export function allEventItemIds(): number[] {
  return Array.from(new Set(GW2_EVENTS.flatMap((e) => e.groups.flatMap((g) => g.items.map((i) => i.id)))))
}
