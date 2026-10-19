// Mensajes listos para Marketplace, en el orden en que se mandan. Cortos y en
// tono normal: con muchos tratos al día, el que contesta rápido y claro gana.
//
// Orden de compra: ¿sigue disponible? → 2–3 preguntas → oferta con lugar, día
// y hora (llamado a la acción) → ya quedamos: captura del IMEI → confirmación.

import type { AuthMode, AuthProduct } from './checklists'

export type ChatVars = { lugar: string; hora: string; precio: string }

export type ChatScript = {
  id: string
  title: string
  /** Cuándo se manda o qué hacer con la respuesta. */
  when: string
  text: (v: ChatVars) => string
}

export const DEFAULT_LUGAR = 'Antara Polanco'

const show = (v: string, empty: string) => v.trim() || empty
const L = (v: ChatVars) => show(v.lugar, DEFAULT_LUGAR)
const H = (v: ChatVars) => show(v.hora, '[día y hora]')
const P = (v: ChatVars) => {
  const n = Number(v.precio.replace(/[^\d]/g, ''))
  return n ? `$${n.toLocaleString('es-MX')}` : '$[precio]'
}

const QUESTIONS: Record<AuthProduct, string> = {
  IPHONE: 'Unas preguntas rápidas: ¿qué % de batería tiene? ¿Le han cambiado algo (pantalla, batería)? ¿Face ID funciona bien? ¿Lo compraste tú y está con tu Apple ID? ¿Trae caja?',
  IPAD: 'Unas preguntas rápidas: ¿es Wi-Fi o Cellular? ¿Qué % de batería tiene? ¿Lo han reparado? ¿Lo compraste tú y está con tu Apple ID (no de escuela o empresa)? ¿Trae cargador?',
  MACBOOK: 'Unas preguntas rápidas: ¿cuántos ciclos de batería tiene? ¿La han abierto o reparado? ¿La compraste tú y está con tu Apple ID (no de empresa)? ¿Trae cargador original?',
  AUDIFONOS: 'Unas preguntas rápidas: ¿los compraste tú en tienda? ¿Están en tu app Encontrar? ¿Trae caja? ¿La batería dura parejo en los dos?',
  BOLSOS: '¿Dónde la compraste? ¿Trae dust bag, caja o ticket? ¿Me mandas foto de la etiqueta o código interior y de las esquinas? Te comento que la autentico con Entrupy en la entrega.',
}

const IDENT: Record<AuthProduct, string> = {
  IPHONE: '¿me mandas captura de Ajustes › General › Información? (donde sale el IMEI) Lo checo en el portal del gobierno, es rápido.',
  IPAD: '¿me mandas captura de Ajustes › General › Información? (donde sale la serie) Es rápido.',
  MACBOOK: '¿me mandas captura de menú Apple › Acerca de esta Mac? (donde sale la serie) Es rápido.',
  AUDIFONOS: '¿me mandas foto del número de serie? Viene en la tapa del estuche por dentro, o en Ajustes › tus AirPods.',
  BOLSOS: '¿me mandas foto del código o etiqueta interior? Es para ir con el modelo correcto en la app.',
}

const BRING: Record<AuthProduct, string> = {
  IPHONE: 'Tráelo cargado y que sepas la contraseña de tu Apple ID: al final cerramos sesión y lo borramos juntos.',
  IPAD: 'Tráelo cargado y que sepas la contraseña de tu Apple ID: al final cerramos sesión y lo borramos juntos.',
  MACBOOK: 'Tráela cargada, con el cargador, y que sepas la contraseña de tu Apple ID: al final cerramos sesión y la borramos juntos.',
  AUDIFONOS: 'Tráelos cargados y ten a la mano tu iPhone: al final los quitas de tu app Encontrar.',
  BOLSOS: 'La escaneo con Entrupy ahí mismo (son unos 10 minutos) y te transfiero al momento.',
}

const buy = (p: AuthProduct): ChatScript[] => [
  {
    id: 'hola',
    title: '1 · Primer mensaje',
    when: 'Nada más. Si contesta, sigues; si tarda horas, ya se vendió o no le urge.',
    text: () => 'Hola, ¿sigue disponible?',
  },
  {
    id: 'preguntas',
    title: '2 · Preguntas',
    when: 'Un solo mensaje, solo lo que mueve el precio. Lo demás se ve en persona.',
    text: () => QUESTIONS[p],
  },
  {
    id: 'oferta',
    title: '3 · Oferta con lugar, día y hora',
    when: 'Aquí es el regateo (ver "Cuándo regatear"). Precio, lugar, hora y pago en un mensaje: lo que das a cambio del descuento es certeza y rapidez.',
    text: (v) => `Me interesa. Te ofrezco ${P(v)}; me queda en ${L(v)} ${H(v)}. Lo reviso ahí y te transfiero en el momento, sin vueltas. ¿Te late?`,
  },
  {
    id: 'lejos',
    title: 'Si le queda lejos',
    when: 'Con márgenes de miles, $150 de Uber es nada. Si aun así no, déjalo ir.',
    text: (v) => `Si te queda lejos te pongo $150 para el Uber. Prefiero ${L(v)} porque hay cámaras y gente, es más seguro para los dos.`,
  },
  {
    id: 'contra',
    title: 'Si contraoferta',
    when: 'Sube una vez, a la mitad entre tu oferta y su número (sin pasar tu tope). Si no acepta, márcalo Vigilando y usa el seguimiento.',
    text: (v) => `Ni tú ni yo: ${P(v)} y nos vemos ${H(v)} en ${L(v)}. Si te late, lo apartamos.`,
  },
  {
    id: 'seguimiento',
    title: 'Seguimiento (5–7 días después)',
    when: 'Si no aceptó y sigue publicado. Aquí se cierran muchos: ya vio que a su precio no sale.',
    text: (v) => `Hola, ¿todavía lo tienes? Mi oferta de ${P(v)} sigue en pie; puedo pasar ${H(v)} a ${L(v)} y te transfiero ahí.`,
  },
  {
    id: 'quedamos',
    title: '4 · Ya quedamos: captura',
    when: 'Ya con lugar y hora. Con la captura revisas el CRT y pegas el IMEI/serie abajo.',
    text: (v) => `Perfecto, ${H(v)} en ${L(v)}. Para ir a la segura, ${IDENT[p]}`,
  },
  {
    id: 'confirmar',
    title: '5 · El día de la cita',
    when: '1–2 horas antes. Si no contesta, no salgas.',
    text: (v) => `Hola, ¿seguimos en pie ${H(v)} en ${L(v)}? ${BRING[p]}`,
  },
]

const sell = (p: AuthProduct): ChatScript[] => [
  {
    id: 'hola',
    title: '1 · Respuesta a interesado',
    when: 'Al vender tú pones el lugar: el que quiere comprar se acomoda.',
    text: (v) => `Hola, sí sigue disponible. Lo entrego en ${L(v)}. ¿Qué día y hora te queda?`,
  },
  {
    id: 'precio',
    title: '2 · Si pide descuento',
    when: 'Publica un poco arriba de tu mínimo para dejar regateo. Aquí pones tu mínimo y lo dices una vez, a cambio de cerrar ya.',
    text: (v) => `Te lo dejo en ${P(v)} si nos vemos ${H(v)}. Lo puedes revisar todo ahí con calma${p === 'BOLSOS' ? ', y trae certificado de autenticidad Entrupy' : ''}.`,
  },
  {
    id: 'cita',
    title: '3 · Confirmar cita y pago',
    when: 'Deja el pago claro antes de verse: así no hay sorpresas en la mesa.',
    text: (v) => `Va, ${H(v)} en ${L(v)}. El pago es por transferencia y lo entrego en cuanto la veo reflejada en mi app (no con captura). Si prefieres efectivo, lo revisamos ahí.`,
  },
  {
    id: 'dia',
    title: '4 · El día de la cita',
    when: '1–2 horas antes. Si no contesta, no salgas.',
    text: (v) => `Hola, ¿seguimos en pie ${H(v)} en ${L(v)}? Avísame cuando llegues.`,
  },
]

// ─── Marco ───────────────────────────────────────────────────────────────────
// Cómo trabaja un revendedor con volumen: rápido, concreto, sin discutir, y con
// regateo en el chat (nunca en la mesa) y revisión del IMEI antes de cada paso
// que ya no tiene regreso.

export const PRINCIPLES: Record<AuthMode, { title: string; body: string }[]> = {
  COMPRA: [
    { title: 'Gana el más rápido y concreto', body: 'Los buenos precios duran horas. Gana el que contesta primero con precio, lugar y hora, no el que más pregunta.' },
    { title: 'Primero, cero condiciones', body: '"¿Sigue disponible?" y 2–3 preguntas que mueven el precio. Polanco va con la oferta, como lo que te queda; si le queda lejos, le pagas el Uber.' },
    { title: 'Se regatea en el chat, con número', body: 'Todos lo esperan. Antes de escribir decides oferta y tope con el CRM (% vs mercado, antigüedad, si ya bajó). Qué tanto depende del listing: ver "Cuándo regatear".' },
    { title: 'En la mesa solo por defectos', body: 'Lo que quedó en el chat se respeta. Se ajusta solo por algo que no te dijo (batería, pieza, golpe), con el costo de arreglarlo como número.' },
    { title: 'IMEI antes de cada paso clave', body: 'Lo anotas al quedar y lo vuelves a checar cuando te lo regresa ya borrado y justo antes de transferir. Tu Apple ID es el último paso; si algo falla antes, te vas sin pena.' },
  ],
  VENTA: [
    { title: 'Publica arriba de tu mínimo', body: 'Todos van a regatear: publica ~8–10% arriba de tu mínimo. El descuento se da una vez, a cambio de cerrar ya (día y hora), nunca a quien solo pregunta.' },
    { title: 'Que revise todo, frente a ti', body: 'Con tu Apple ID puesto: si se lo quiere llevar sin pagar, no le sirve. Una persona por trato.' },
    { title: 'Cobras y luego entregas', body: 'El equipo es suyo cuando el pago está completo. Y lo que ya te pagaron no regresa: ni "déjame contarlo", ni "mejor te transfiero". Si te lo regresa, checa IMEI antes de aceptarlo.' },
    { title: 'Dinero real', body: 'Transferencia vista en tu app (no captura). Efectivo revisado billete por billete antes de entregar.' },
    { title: 'Cierre limpio', body: 'Ya cobrado: quitas tu cuenta, borras frente a él y firman nota de venta. Sin garantías verbales.' },
  ],
}

// ─── Cuándo regatear ─────────────────────────────────────────────────────────
// El poder de negociación lo da el listing, no la labia. Los % son punto de
// partida; ajústalos con lo que veas cerrar en tus primeros tratos.

export const REGATEO: Record<AuthMode, { situacion: string; como: string }[]> = {
  COMPRA: [
    { situacion: 'Ganga: score alto, 15%+ abajo del mercado, publicado hoy', como: 'Casi no regatees (redondea a lo mucho). El riesgo es perderlo por $300; contesta primero y cierra hoy.' },
    { situacion: 'A precio de mercado, publicado hoy o ayer', como: 'Oferta 8–12% abajo. Esperan regateo; lo que das a cambio es verse hoy y transferencia en el momento.' },
    { situacion: 'Publicado hace 7+ días, o ya bajó de precio (precio tachado)', como: 'El mejor momento: 15–20% abajo. Ya vio que a su precio no sale. Si no acepta, Vigilando y seguimiento.' },
    { situacion: 'Urgencia: "urge", "hoy", "me voy", "necesito el dinero"', como: '15%+ abajo con cita hoy mismo. La rapidez vale más para él que el último peso.' },
    { situacion: 'Caro: arriba del mercado', como: 'No regatees contra su número: ofreces el tuyo con "se están vendiendo en $X". Si no, Vigilando y vuelves en una semana.' },
    { situacion: 'En persona sale un defecto que no te dijo', como: 'Descuento = costo de arreglarlo (batería, pantalla…), dicho como número. Si no acepta, te vas sin discutir.' },
  ],
  VENTA: [
    { situacion: 'Publicación nueva (primeros 2–3 días)', como: 'Aguanta el precio: los primeros interesados son los más motivados. A lo mucho redondeo por cerrar hoy.' },
    { situacion: 'Pide descuento y ya propuso día y hora', como: 'Una sola concesión, hasta tu mínimo, atada a verse hoy o mañana.' },
    { situacion: 'Pide descuento sin comprometerse', como: '"Si nos vemos hoy te lo dejo en $X." Sin cita no hay descuento.' },
    { situacion: 'Oferta muy baja', como: '"Gracias, el precio está en $X." Sin contraoferta: si de verdad quiere, sube él.' },
    { situacion: 'Lleva 7–10 días sin venderse', como: 'Baja el anuncio 5% (sale "precio reducido" y avisa a quien lo guardó) y escribe a los que preguntaron.' },
  ],
}

export function chatScripts(mode: AuthMode, p: AuthProduct): ChatScript[] {
  return mode === 'COMPRA' ? buy(p) : sell(p)
}
