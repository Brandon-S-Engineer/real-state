// ── Templates de respuesta por bloques ───────────────────────────────────────
//
// Cada mensaje se compone tomando UNA variante aleatoria de cada bloque.
// Combinaciones posibles con los defaults: 6 × 5 × 5 × 4 × 6 = 3,600
// + variaciones de probabilidad (drop opcional de algunos bloques).
//
// Sin IA. Todo es ensamblaje aleatorio de texto pre-escrito.

export const DEFAULT_TEMPLATES = {
  zona: 'Interlomas',
  blocks: {
    saludo: [
      'Hola {nombre}',
      'Qué tal {nombre}',
      'Oye {nombre}',
      'Buenas {nombre}',
      'Hey {nombre}',
      'Hola, {nombre}, qué tal',
    ],
    referencia: [
      'vi tu publicación',
      'leí lo que andas buscando',
      'me llamó la atención lo que pusiste',
      'vi que andas en búsqueda',
      'me topé con tu post',
    ],
    presentacion: [
      'soy agente inmobiliario y trabajo zona {zona}',
      'manejo propiedades en {zona}, tal vez tenga algo que matchee',
      'ando en bienes raíces enfocado a {zona}',
      'soy broker, trabajo el área de {zona}',
      'trabajo con varios listados en {zona}',
    ],
    oferta: [
      'tengo opciones que podrían interesarte',
      'te puedo armar una lista con lo que aplica',
      'manejo algunos listados que tal vez te sirvan',
      'tengo info que puede caerte bien',
    ],
    cierre: [
      '¿te late agendar una llamada rápida?',
      '¿te paso info por aquí o por WhatsApp?',
      '¿me das tu WhatsApp y te pego opciones?',
      '¿te interesa que te mande material?',
      '¿te late platicarlo?',
      '¿qué te parece si te mando algunas?',
    ],
  },
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function firstName(fullName) {
  if (!fullName) return ''
  return fullName.trim().split(/\s+/)[0]
}

function capFirst(s) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Compone un mensaje aleatorio para un lead.
 * @param {object} templates  — la estructura `{ zona, blocks }`
 * @param {string} author     — nombre completo del autor del post
 * @returns {string} mensaje listo para pegar
 */
export function composeMessage(templates, author) {
  const t = templates ?? DEFAULT_TEMPLATES
  const blocks = t.blocks ?? DEFAULT_TEMPLATES.blocks
  const zona = (t.zona ?? '').trim() || 'la zona'
  const nombre = firstName(author) || 'qué tal'

  const parts = []

  // Saludo (siempre)
  if (blocks.saludo?.length) {
    parts.push(pick(blocks.saludo).replaceAll('{nombre}', nombre))
  }

  // Referencia al post (80% de probabilidad)
  if (blocks.referencia?.length && Math.random() > 0.2) {
    parts.push(pick(blocks.referencia))
  }

  // Presentación (siempre)
  if (blocks.presentacion?.length) {
    parts.push(pick(blocks.presentacion).replaceAll('{zona}', zona))
  }

  // Oferta (85%)
  if (blocks.oferta?.length && Math.random() > 0.15) {
    parts.push(pick(blocks.oferta))
  }

  // Cierre (siempre)
  if (blocks.cierre?.length) {
    parts.push(pick(blocks.cierre))
  }

  // Unión con ". " y capitalización del primer carácter de cada bloque
  // (salvo el primero que ya viene capitalizado o con nombre propio)
  let msg = parts.map((p, i) => (i === 0 ? p : capFirst(p))).join('. ')

  // Limpieza: "?." y "?,..." → "?"
  msg = msg.replace(/\?\.\s*/g, '? ').replace(/\?\s+\./g, '? ').trim()

  // Asegurar terminación con signo de cierre
  if (!/[.?!]$/.test(msg)) msg += '.'

  return msg
}

/** Texto plano de las plantillas listo para mostrar/editar en un textarea. */
export function blocksToText(blocks) {
  const keys = ['saludo', 'referencia', 'presentacion', 'oferta', 'cierre']
  return keys.map((k) => (blocks[k] ?? []).join('\n')).reduce((acc, v, i) => {
    acc[keys[i]] = v
    return acc
  }, {})
}

/** Convierte el texto de un textarea (una variante por línea) a array. */
export function textToBlock(text) {
  return text.split('\n').map((s) => s.trim()).filter(Boolean)
}
