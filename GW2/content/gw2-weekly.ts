// ── Ciclo semanal: ¿qué día conviene comprar? ────────────────────────────────
//
// Hipótesis: el finde los casuales inundan la oferta (salvagean y venden en masa),
// hunden el precio; lunes-jueves los comprometidos siguen demandando y lo suben.
// Si eso es real, comprás miles del ítem por orden el día barato y posteás/procesás
// la salida el día caro — ganancia extra SOLO por timing, sin habilidad de juego.
//
// No lo damos por hecho: la tabla mide el patrón real de años de datos por día de
// la semana y deja que los números decidan qué es abusable y qué no.

export type WeeklyItem = { id: number; note: string }

export const WEEKLY_ITEMS: WeeklyItem[] = [
  { id: 83008, note: 'Amarillo: comprá miles por orden el día barato; abrí y posteá la salida el día caro.' },
  { id: 84731, note: 'Verde: el finde entra sobreoferta de casuales; comprá barato, procesá y vendé mats después.' },
  { id: 19721, note: 'Ecto: input universal de alto volumen — guardar unos días entre el día barato y el caro capta el ciclo.' },
  { id: 24277, note: 'Crystalline Dust: sumidero de Mystic Forge; acumulá el día de sobreoferta.' },
  { id: 89140, note: 'Lucent Mote: su volumen sube con el salvage del finde; comprá en el piso semanal.' },
  { id: 19976, note: 'Mystic Coin: altísima liquidez; incluso el micro-ciclo semanal suma sobre el hold largo.' },
]

export function weeklyItemIds(): number[] {
  return WEEKLY_ITEMS.map((w) => w.id)
}
