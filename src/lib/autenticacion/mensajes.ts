// Mensajes listos para Marketplace, en el orden en que se mandan. Cortos y en
// tono normal: con muchos tratos al día, el que contesta rápido y claro gana.
//
// Orden de compra: disponible + Polanco (filtro) → preguntas → oferta con día
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
    when: 'Lo primero es el lugar: si no puede ir a Polanco, ya no sigas.',
    text: (v) => `Hola, ¿sigue disponible? Me interesa. ¿Me lo podrías entregar en ${L(v)}?`,
  },
  {
    id: 'no-polanco',
    title: 'Si no puede ir',
    when: 'Corto y sin negociar el lugar. A veces regresan.',
    text: (v) => `Va, gracias. Por seguridad solo hago entregas en ${L(v)}. Si en algún momento te queda, aquí sigo.`,
  },
  {
    id: 'preguntas',
    title: '2 · Preguntas',
    when: 'Un solo mensaje. Lo demás lo revisas en persona.',
    text: () => QUESTIONS[p],
  },
  {
    id: 'oferta',
    title: '3 · Oferta con día y hora',
    when: 'Oferta + cuándo + cómo pagas en el mismo mensaje: el que se compromete a pasar hoy le gana al que solo pregunta.',
    text: (v) => `Te ofrezco ${P(v)} y paso ${H(v)} a ${L(v)}. Te transfiero ahí mismo después de revisarlo. ¿Te late?`,
  },
  {
    id: 'contra',
    title: 'Si contraoferta',
    when: 'Pon aquí tu tope. Si no baja a tu tope, déjalo ir: hay muchos.',
    text: (v) => `Lo más que puedo es ${P(v)}, y nos vemos ${H(v)} en ${L(v)}. Si te late, lo apartamos.`,
  },
  {
    id: 'quedamos',
    title: '4 · Ya quedamos: captura',
    when: 'Ya con lugar y hora. Con la captura revisas el CRT y apuntas el IMEI/serie arriba.',
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
    when: 'Lugar desde el principio; así no pierdes tiempo con quien no va a ir.',
    text: (v) => `Hola, sí sigue disponible. Lo entrego en ${L(v)}. ¿Qué día y hora te queda?`,
  },
  {
    id: 'precio',
    title: '2 · Si pide descuento',
    when: 'Precio P75: es firme si está bien presentado. Si acaso, un descuento chico por cerrar hoy.',
    text: (v) => `El precio es ${P(v)}. Lo puedes revisar todo ahí con calma${p === 'BOLSOS' ? ', y trae certificado de autenticidad Entrupy' : ''}. Si nos vemos ${H(v)}, te lo aparto.`,
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

export function chatScripts(mode: AuthMode, p: AuthProduct): ChatScript[] {
  return mode === 'COMPRA' ? buy(p) : sell(p)
}
