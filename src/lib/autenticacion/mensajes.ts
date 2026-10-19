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
    when: 'El llamado a la acción: precio, lugar, hora y pago en un mensaje. Polanco va como lo que te queda, no como condición.',
    text: (v) => `Me interesa. Te ofrezco ${P(v)}; me queda en ${L(v)} ${H(v)}. Lo reviso ahí y te transfiero en el momento. ¿Te late?`,
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
    when: 'Pon aquí tu tope y dilo una sola vez. Si no llega, déjalo ir: hay cientos al día.',
    text: (v) => `Lo más que puedo es ${P(v)}, y nos vemos ${H(v)} en ${L(v)}. Si te late, lo apartamos.`,
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
// una sola regla de seguridad que no se negocia (las dos manos).

export const PRINCIPLES: Record<AuthMode, { title: string; body: string }[]> = {
  COMPRA: [
    { title: 'Gana el más rápido y concreto', body: 'Los buenos precios duran horas. Gana el que contesta primero con precio, lugar y hora, no el que más pregunta.' },
    { title: 'Primero, cero condiciones', body: '"¿Sigue disponible?" y 2–3 preguntas que mueven el precio. Polanco va con la oferta, como lo que te queda; si le queda lejos, le pagas el Uber.' },
    { title: 'Ofreces con número del CRM', body: 'Ofreces cerca del P25 y tienes un tope antes de escribir. Si no llega, lo dejas ir sin discutir: hay cientos al día.' },
    { title: 'En persona no se regatea', body: 'Solo se ajusta por algo que no te dijo (batería, pieza, golpe), con el costo a la mano. Regatear porque sí quema tiempo y la cita.' },
    { title: 'Las dos manos', body: 'Desde que lo revisas, el equipo no sale de tu mano y pagas con él en la mano. Tu Apple ID es el último paso; si algo falla antes, te vas sin pena.' },
  ],
  VENTA: [
    { title: 'Publica arriba de tu mínimo', body: 'Deja margen para el regateo y decide tu mínimo antes de contestar. Contesta rápido y propone tú lugar y hora.' },
    { title: 'Que revise todo, frente a ti', body: 'Con tu Apple ID puesto: si se lo quiere llevar sin pagar, no le sirve. Una persona por trato.' },
    { title: 'Las dos manos', body: 'El equipo pasa a su mano cuando el pago completo está en la tuya. Y lo que ya te pagaron no regresa: ni "déjame contarlo", ni "mejor te transfiero".' },
    { title: 'Dinero real', body: 'Transferencia vista en tu app (no captura). Efectivo revisado billete por billete antes de entregar.' },
    { title: 'Cierre limpio', body: 'Ya cobrado: quitas tu cuenta, borras frente a él y firman nota de venta. Sin garantías verbales.' },
  ],
}

export function chatScripts(mode: AuthMode, p: AuthProduct): ChatScript[] {
  return mode === 'COMPRA' ? buy(p) : sell(p)
}
